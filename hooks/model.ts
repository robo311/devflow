import type { FlowState } from '../types'

export const PHASES = ['plan', 'implement', 'review', 'summary', 'finish'] as const

const PLAN_STEPS = ['ground', 'decide', 'builder-check', 'approve']
const REVIEW_STEPS = ['packet', 'find', 'verify', 'fix', 'round-2', 'report']

export type Mark = 'done' | 'current' | 'pending'

export function phaseMark(state: FlowState, phase: string): Mark {
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
  const names = state.phase === 'plan' ? PLAN_STEPS : state.phase === 'review' ? REVIEW_STEPS : []
  const at = names.indexOf(state.step ?? '')
  return names.map((name, index) => ({
    name,
    mark: at < 0 ? 'pending' : index < at ? 'done' : index === at ? 'current' : 'pending',
  }))
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
