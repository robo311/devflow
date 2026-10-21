import type { FlowPart, FlowState } from '../types'

export const PHASES = ['plan', 'implement', 'review', 'summary', 'finish'] as const

const PLAN_STEPS = ['ground', 'decide', 'write', 'builder-check', 'approve']
const REVIEW_STEPS = ['packet', 'find', 'verify', 'fix', 'round-2', 'report']

export type Mark = 'done' | 'current' | 'pending' | 'skipped'

export function phaseMark(state: FlowState, phase: string): Mark {
  if (phase !== state.phase && (state.skipped ?? []).includes(phase)) return 'skipped'
  if (state.phase === 'done') return 'done'
  const at = PHASES.indexOf((state.phase ?? 'plan') as (typeof PHASES)[number])
  const index = PHASES.indexOf(phase as (typeof PHASES)[number])
  if (index < at) return 'done'
  return index === at ? 'current' : 'pending'
}

/** The sub-steps of the current phase, each marked against `state.step`. */
export function currentSteps(state: FlowState): { name: string; mark: Mark }[] {
  if (state.phase === 'implement') {
    const parts = (state.parts ?? []).map(part => ({
      name: `part ${part.n}`,
      mark: (part.status === 'done' ? 'done' : part.status === 'pending' ? 'pending' : 'current') as Mark,
    }))
    const isIntegrating = state.step === 'integrate'
    return [...parts, { name: 'integrate', mark: isIntegrating ? 'current' : 'pending' }]
  }
  if (state.phase === 'finish') {
    return (state.followUps ?? []).map(item => ({
      name: `follow-up ${item.n}`,
      mark: (item.status === 'working' ? 'current' : 'done') as Mark,
    }))
  }
  // only a full plan gets a builder check
  const planSteps = state.tier === 'light' ? PLAN_STEPS.filter(name => name !== 'builder-check') : PLAN_STEPS
  const names = state.phase === 'plan' ? planSteps : state.phase === 'review' ? REVIEW_STEPS : []
  const at = names.indexOf(state.step ?? '')
  return names.map((name, index) => ({
    name,
    mark: at < 0 ? 'pending' : index < at ? 'done' : index === at ? 'current' : 'pending',
  }))
}

export type Activity = 'waiting' | 'working' | 'idle'

/**
 * What the session is doing for the developer. `waitingFor` comes from state.json, which a skill
 * can leave set after the developer answered; a running turn or a subagent still at work in the
 * background outranks it, an open question does not.
 */
export function activity(
  waitingFor: string | null | undefined,
  session: { isWorking: boolean; isAsking: boolean; isAgentRunning?: boolean },
): Activity {
  if (session.isAsking) return 'waiting'
  if (session.isWorking || session.isAgentRunning) return 'working'
  return waitingFor ? 'waiting' : 'idle'
}

/**
 * The main session's row. Its subagents run in the background, so its own turn can end while
 * they work: then it waits on them, which outranks a `waitingFor` left in state.json.
 */
export function mainStatus(
  waitingFor: string | null | undefined,
  main: { isWorking: boolean; isAsking: boolean; turnStartedAt?: number; turnEndedAt?: number },
  runningRoles: string[],
  at: number,
): { tone: Activity; text: string } {
  if (main.isAsking) return { tone: 'waiting', text: 'waiting for you' }
  if (main.isWorking) return { tone: 'working', text: `working ${ago(at - (main.turnStartedAt ?? at))}` }
  if (runningRoles.length > 0) return { tone: 'working', text: `waiting on ${[...new Set(runningRoles)].join(', ')}` }
  if (waitingFor) return { tone: 'waiting', text: 'waiting for you' }
  return { tone: 'idle', text: `idle ${ago(at - (main.turnEndedAt ?? at))}` }
}

/** An agent row's status word and how long it ran, or has been running. */
export function agentStatus(agent: { startedAt: number; endedAt?: number }, at: number): { isRunning: boolean; text: string } {
  const isRunning = agent.endedAt === undefined
  return isRunning
    ? { isRunning, text: `running ${ago(at - agent.startedAt)}` }
    : { isRunning, text: `done in ${ago(agent.endedAt! - agent.startedAt)}` }
}

const time = (iso?: string) => {
  const ms = iso ? Date.parse(iso) : NaN
  return Number.isNaN(ms) ? undefined : ms
}

/**
 * How long a phase took, from `phaseStarts`: up to the next phase recorded after it (skipped ones
 * have none), or up to now while it is the current one. Undefined without its start.
 */
export function phaseDuration(state: FlowState, phase: string, at: number): number | undefined {
  const starts = state.phaseStarts ?? {}
  const start = time(starts[phase])
  if (start === undefined) return undefined
  const later = [...PHASES.slice(PHASES.indexOf(phase as (typeof PHASES)[number]) + 1), 'done']
  const end = later.map(name => time(starts[name])).find(ms => ms !== undefined)
  if (end !== undefined) return end - start
  return phaseMark(state, phase) === 'current' ? at - start : undefined
}

/** How long the whole task took, or has taken so far, from its first recorded phase. */
export function taskDuration(state: FlowState, at: number): number | undefined {
  const starts = Object.values(state.phaseStarts ?? {}).map(time).filter((ms): ms is number => ms !== undefined)
  if (starts.length === 0) return undefined
  const end = time(state.phaseStarts?.done) ?? (state.phase === 'done' ? undefined : at)
  return end === undefined ? undefined : end - Math.min(...starts)
}

/** How long a phase waited for the developer: its recorded `waited`, plus the wait still open in it. */
export function phaseWaiting(state: FlowState, phase: string, at: number): number {
  const since = time(state.waitingSince ?? undefined)
  const open = since !== undefined && phase === state.phase ? at - since : 0
  return (state.waited?.[phase] ?? 0) * 1000 + open
}

/** How long the whole task waited for the developer. */
export function taskWaiting(state: FlowState, at: number): number {
  const since = time(state.waitingSince ?? undefined)
  const recorded = Object.values(state.waited ?? {}).reduce((sum, seconds) => sum + seconds, 0)
  return recorded * 1000 + (since === undefined ? 0 : at - since)
}

/** How long a part's implementer ran: to its report, or to now while it runs (again). */
export function partDuration(part: FlowPart, at: number): number | undefined {
  const start = time(part.startedAt)
  if (start === undefined) return undefined
  const end = part.status === 'running' ? at : time(part.finishedAt)
  return end === undefined ? undefined : end - start
}

const STEP_LABEL: Record<string, string> = {
  ground: 'read the project',
  decide: 'questions',
  write: 'write plan',
  'builder-check': 'plan check',
  approve: 'approval',
  integrate: 'final checks',
  packet: 'prepare',
  find: 'find bugs',
  verify: 'verify findings',
  fix: 'fixes',
  'round-2': 'round 2',
  report: 'report',
}

const STEP_HINT: Record<string, string> = {
  ground: 'reading your docs and code',
  decide: 'settling open decisions with you',
  write: 'writing the plan and its parts',
  'builder-check': 'fresh agents read the plan as the builder would',
  approve: 'your go-ahead to build',
  part: 'an implementer builds this part',
  integrate: 'project checks over the whole change',
  packet: 'collecting the diff, docs and check results',
  find: 'a finder looks for real bugs',
  verify: 'verifiers try to disprove each candidate',
  fix: 'obvious fixes applied, the rest asked',
  'round-2': 're-checking only the fixes',
  report: 'writing the review report',
  'follow-up': 'a change you asked for after the summary',
}

/** A sub-step's name as the developer reads it; parts and follow-ups carry what they are about. */
export function stepLabel(step: string, state: FlowState): string {
  const part = /^part (\d+)$/.exec(step)
  if (part) {
    const title = (state.parts ?? []).find(p => p.n === Number(part[1]))?.title
    return title ? `${step} · ${title}` : step
  }
  const followUp = /^follow-up (\d+)$/.exec(step)
  if (followUp) {
    const item = (state.followUps ?? []).find(f => f.n === Number(followUp[1]))
    if (!item) return step
    return `${step} · ${item.ask}${item.status === 'moved' ? ' → new task' : ''}`
  }
  return STEP_LABEL[step] ?? step
}

/** One line on what happens in a sub-step. */
export function stepHint(step: string): string {
  return STEP_HINT[/^part \d+$/.test(step) ? 'part' : /^follow-up \d+$/.test(step) ? 'follow-up' : step] ?? ''
}

/** The phase that comes after the current one, past any recorded skips; none at the end. */
export function nextPhase(state: FlowState): string | undefined {
  const at = PHASES.indexOf((state.phase ?? '') as (typeof PHASES)[number])
  if (at < 0) return undefined
  return PHASES.slice(at + 1).find(phase => !(state.skipped ?? []).includes(phase))
}

export function ago(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`
}

export function tokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}

/** Green while comfortable, amber when getting full, red near the limit. */
export function loadColor(percent: number): number {
  if (percent >= 85) return COLORS.critical
  if (percent >= 60) return COLORS.medium
  return COLORS.verifier
}

/** A rate-limit window's label: `five_hour` → `5h`, `seven_day` → `7d`. */
export function windowLabel(kind: string): string {
  if (kind === 'five_hour') return '5h'
  if (kind === 'seven_day') return '7d'
  return kind.replace(/_/g, ' ').slice(0, 7)
}

/** One line on what a tool call is doing, from its input. */
export function describeCall(tool: string, input: Record<string, unknown>): string {
  const pick = (key: string) => (typeof input[key] === 'string' ? (input[key] as string) : undefined)
  const file = pick('file_path')
  const target =
    (file && file.split('/').slice(-2).join('/')) ??
    pick('pattern') ??
    pick('command') ??
    pick('description') ??
    pick('skill') ??
    ''
  return `${tool} ${target}`.trim().slice(0, 70)
}

/**
 * The devflow task folders a tool call touched (`.flow/<slug>` or `.flow/reviews/<ts>`, relative or
 * absolute, in this project or another): the tasks this session works on. Globs and shell variables
 * name no task.
 */
export function flowTasksIn(input: Record<string, unknown>): string[] {
  const tasks = new Set<string>()
  for (const value of Object.values(input)) {
    if (typeof value !== 'string') continue
    for (const match of value.matchAll(/((?:[^\s'"`;|&()<>=]*\/)?\.flow\/)(reviews\/)?([^/\s'"`;|&()<>*?[{$]+)/g)) {
      const [, base, review, name] = match
      if (!review && name === 'reviews') continue
      tasks.add(`${base}${review ?? ''}${name}`)
    }
  }
  return [...tasks]
}

/** How many of the review guide's checkboxes the developer ticked. */
export function guideProgress(text: string): { done: number; total: number } {
  const boxes = text.split('\n').filter(line => /^\s*- \[[ xX]\] /.test(line))
  return { done: boxes.filter(line => /^\s*- \[[xX]\] /.test(line)).length, total: boxes.length }
}

/** Short role name for a subagent type such as `devflow:implementer-be`. */
export function roleOf(type: string): string {
  return type.replace(/^devflow:/, '')
}

export const COLORS = {
  plan: 0x5b8def,
  implement: 0xa57cf5,
  review: 0xf5a524,
  explorer: 0x3cc8b4,
  finder: 0xf08a4b,
  verifier: 0x4cc38a,
  other: 0x8a8f98,
  track: 0x3a3f47,
  critical: 0xd9363e,
  high: 0xf06a3f,
  medium: 0xe2c541,
  low: 0x8a8f98,
  confirmed: 0xe5534b,
  refuted: 0x4cc38a,
  unsettled: 0xe2c541,
} as const

/** A palette color as the hex string Text and Box props take. */
export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}

export function roleColor(type: string): number {
  const role = roleOf(type)
  if (role.startsWith('implementer')) return COLORS.implement
  if (role === 'plan-checker') return COLORS.plan
  if (role === 'explorer') return COLORS.explorer
  if (role === 'finder') return COLORS.finder
  if (role === 'verifier') return COLORS.verifier
  return COLORS.other
}

const DEFAULT_COLOR = 0x01000000
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function toBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1] ?? 0
    const c = bytes[i + 2] ?? 0
    const n = (a << 16) | (b << 8) | c
    out += BASE64[(n >> 18) & 63]! + BASE64[(n >> 12) & 63]!
    out += i + 1 < bytes.length ? BASE64[(n >> 6) & 63]! : '='
    out += i + 2 < bytes.length ? BASE64[n & 63]! : '='
  }
  return out
}

export type Cell = { char: string; fg?: number; bg?: number }

/** Packs cells into a Raster's `cells`: little-endian u32 triplets, base64. */
export function encodeCells(cells: Cell[]): string {
  const words = new Uint32Array(cells.length * 3)
  cells.forEach((cell, i) => {
    words[i * 3] = cell.char.codePointAt(0) ?? 0x20
    words[i * 3 + 1] = cell.fg ?? DEFAULT_COLOR
    words[i * 3 + 2] = cell.bg ?? DEFAULT_COLOR
  })
  return toBase64(new Uint8Array(words.buffer))
}

/** A horizontal bar `filled` cells long in `color`, on a dim track `columns` wide. */
export function barCells(columns: number, filled: number, color: number): Cell[] {
  return Array.from({ length: columns }, (_, i) =>
    i < filled ? { char: '█', fg: color } : { char: '░', fg: COLORS.track },
  )
}

/** An agent's span on a shared timeline from `from` to `to`, `columns` wide. */
export function laneCells(
  columns: number,
  from: number,
  to: number,
  start: number,
  end: number | undefined,
  color: number,
): Cell[] {
  const span = Math.max(1, to - from)
  const first = Math.floor(((start - from) / span) * (columns - 1))
  const last = Math.ceil((((end ?? to) - from) / span) * (columns - 1))
  return Array.from({ length: columns }, (_, i) => {
    if (i < first || i > last) return { char: '·', fg: COLORS.track }
    const isHead = end === undefined && i === last
    return { char: isHead ? '▶' : end === undefined ? '█' : '▓', fg: color }
  })
}

export function scaled(value: number, max: number, columns: number): number {
  if (value <= 0 || max <= 0) return 0
  return Math.max(1, Math.round((value / max) * columns))
}
