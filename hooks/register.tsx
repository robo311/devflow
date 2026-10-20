import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { AgentRow, FlowState, FlowView, SessionInfo } from '../types'
import {
  COLORS,
  PHASES,
  activity,
  agentStatus,
  ago,
  barCells,
  currentSteps,
  describeCall,
  encodeCells,
  flowTasksIn,
  guideProgress,
  hex,
  laneCells,
  loadColor,
  mainStatus,
  nextPhase,
  phaseMark,
  roleColor,
  roleOf,
  scaled,
  stepHint,
  stepLabel,
  tokens,
  windowLabel,
  type Cell,
  type Mark,
} from './model'

const PANE = 'devflow'
const POLL_MS = 2000
const NARRATE_MS = 12000
const ACTIVE_MS = 10 * 60 * 1000

const flow = atom({ plugin: 'devflow', key: 'flow' } as const, null)
const agents = atom({ plugin: 'devflow', key: 'agents' } as const, [])
const now = atom({ plugin: 'devflow', key: 'now' } as const, 0)
const session = atom({ plugin: 'devflow', key: 'session' } as const, null)
const main = atom({ plugin: 'devflow', key: 'main' } as const, { isWorking: false, isAsking: false })
const tasks = atom({ plugin: 'devflow', key: 'tasks' } as const, [])

const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const
// the band sits right under Claude's own orange spinner, so devflow draws in colours of its own
const ACCENT = '#ffc629'
const WORKING = hex(COLORS.explorer)
const RAIL_COLOR: Record<Mark, string> = { done: 'success', current: 'claude', pending: 'inactive', skipped: 'inactive' }
const TIER_COLOR: Record<string, number> = { trivial: COLORS.other, light: COLORS.explorer, full: COLORS.implement }
const PART_GLYPH: Record<string, string> = { done: '✓', blocked: '✗', partial: '◐', pending: '○', running: '▸' }
const PART_COLOR: Record<string, string> = { done: 'success', blocked: 'error', partial: 'warning', pending: 'inactive', running: 'claude' }
const RAIL_GLYPH: Record<Mark, string> = { done: '✓ ', current: '◉ ', pending: '○ ', skipped: '– ' }

/** Nothing runs and nobody is asked, yet the task is not finished: the flow stopped part-way. */
function isStopped(state: FlowState, doing: string, runningCount: number): boolean {
  return doing === 'idle' && runningCount === 0 && state.phase !== undefined && state.phase !== 'done'
}

/** A task's state file: `agents/state.json`, or `state.json` at the top in a task from before 0.2.1. */
const stateFiles = (folder: string) => [`${folder}/agents/state.json`, `${folder}/state.json`]
const taskFolder = (statePath: string) => statePath.replace(/(\/agents)?\/state\.json$/, '')

/**
 * The newest state among the tasks this session worked on. Another session's task in the same
 * project stays out until this session touches it, as `run --resume` does.
 */
async function findFlow($: EngineInterface, folders: string[]): Promise<{ path: string; mtimeMs: number } | null> {
  const candidates = folders.flatMap(stateFiles)
  let newest: { path: string; mtimeMs: number } | null = null
  for (const path of candidates) {
    const stat = await $.fs.stat(path).catch(() => undefined)
    if (stat && (!newest || stat.mtimeMs > newest.mtimeMs)) newest = { path, mtimeMs: stat.mtimeMs }
  }
  return newest
}

function isActive(view: FlowView | null, at: number): boolean {
  if (!view) return false
  // ticking boxes in the review guide counts as working on the task
  const touched = Math.max(view.mtimeMs, view.guide?.mtimeMs ?? 0)
  if (view.state.phase !== 'done') return at - touched < 12 * 60 * 60 * 1000
  return at - touched < ACTIVE_MS
}

let narrationOn = true
let lastPaneDraw = 0
let openedFor = ''
const narratedCount = new Map<string, number>()

async function poll($: EngineInterface) {
  const at = await $.clock.now()
  const found = await findFlow($, await read($, tasks)).catch(() => null)
  const held = await read($, flow)

  if (!found) {
    // the task's files were cleaned up: keep the task on screen as it was, finished
    if (held && held.state.phase !== 'done') {
      await update($, flow, view => (view ? { ...view, state: { ...view.state, phase: 'done', waitingFor: null } } : view))
    }
  } else if (!held || held.path !== found.path || held.mtimeMs !== found.mtimeMs) {
    const text = await $.fs.read(found.path).catch(() => '')
    let state: FlowState | null = null
    try {
      state = JSON.parse(text) as FlowState
    } catch {
      state = null
    }
    if (state) {
      const view: FlowView = { path: found.path, mtimeMs: found.mtimeMs, state }
      if (state.waitingFor && state.waitingFor !== held?.state.waitingFor) {
        $.ui.toast(`devflow is waiting for you: ${state.waitingFor}`)
      }
      await update($, flow, () => view)
      const key = state.task ?? found.path
      if (openedFor !== key && isActive(view, at)) {
        openedFor = key
        // a pane opened unasked waits undrawn on a narrow terminal; say how to open it instead
        void $.ui.open({ id: PANE, title: 'devflow' }).then(opened => {
          if (!opened.isPlaced) $.ui.toast('devflow: the live panel is ready. Type /devflow-status to open it.')
        })
      }
    }
  }

  // the review guide changes on its own, as the developer ticks its boxes
  const current = await read($, flow)
  if (current) {
    const guidePath = `${taskFolder(current.path)}/review-guide.md`
    const stat = await $.fs.stat(guidePath).catch(() => undefined)
    if (!stat) {
      if (current.guide) await update($, flow, view => (view ? { ...view, guide: undefined } : view))
    } else if (current.guide?.mtimeMs !== stat.mtimeMs) {
      const progress = guideProgress(await $.fs.read(guidePath).catch(() => ''))
      await update($, flow, view => (view ? { ...view, guide: { path: guidePath, mtimeMs: stat.mtimeMs, ...progress } } : view))
    }
  }

  const isPaneShown = at - lastPaneDraw < 30000
  if (isPaneShown || (await read($, session)) === null) await refreshSession($)

  const list = await read($, agents)
  const isBusy = list.some(agent => agent.endedAt === undefined) || isActive(await read($, flow), at)
  if (isBusy || isPaneShown) await update($, now, () => at)
}

async function refreshSession($: EngineInterface) {
  const usage = await $.session.usage().catch(() => undefined)
  const model = await $.session.model().catch(() => undefined)
  const settings = await $.settings.read().catch(() => ({}) as Record<string, unknown>)
  const effort = typeof settings.effortLevel === 'string' ? settings.effortLevel : undefined
  const info: SessionInfo = {
    model,
    effort,
    contextTokens: usage?.context.tokens,
    contextWindow: usage?.context.window,
    contextPercent: usage?.context.percent,
    costUsd: usage?.cost?.usd,
    startedAt: usage?.startedAt,
    rateLimits: (usage?.rateLimits ?? []).map(limit => ({
      kind: limit.kind,
      percentUsed: limit.percentUsed,
      resetsAt: limit.resetsAt,
    })),
  }
  const held = await read($, session)
  if (JSON.stringify(held) !== JSON.stringify(info)) await update($, session, () => info)
}

async function narrate($: EngineInterface) {
  if (!narrationOn) return
  const at = await $.clock.now()
  if (at - lastPaneDraw > 30000) return
  const list = await read($, agents)
  for (const agent of list) {
    if (agent.endedAt !== undefined || agent.recent.length === 0) continue
    if (narratedCount.get(agent.id) === agent.tools) continue
    narratedCount.set(agent.id, agent.tools)
    const reply = await $.model.complete({
      model: 'haiku',
      effort: 'low',
      // Haiku thinks by default and its thinking counts toward this cap; the reply is trimmed below.
      maxTokens: 300,
      timeoutMs: 8000,
      system: 'You narrate coding agents for a progress display. Reply with one short present-tense phrase, at most 9 words, no period.',
      prompt: `Agent role: ${roleOf(agent.type)}\nTask: ${agent.label}\nMost recent actions, oldest first:\n${agent.recent.join('\n')}\n\nWhat is it doing right now?`,
    })
    if (reply.isAnswered) {
      const text = reply.text.trim().split('\n')[0]?.trim().slice(0, 80) ?? ''
      if (text) await update($, agents, rows => rows.map(row => (row.id === agent.id ? { ...row, narration: text } : row)))
    }
  }
}

export const register: Register = (on, options) => {
  narrationOn = options.narration !== false

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'devflow-status',
      description: 'Open the devflow panel: session, agents and the current devflow task',
      immediate: true,
    })
    $.clock.every(POLL_MS, () => void poll($))
    $.clock.every(NARRATE_MS, () => void narrate($))
    await poll($)

    return next(e)
  })

  on('command.run', { command: 'devflow-status' }, async $ => {
    await $.ui.open({ id: PANE, title: 'devflow' })
    const view = await read($, flow)
    if (!view) return { text: 'No devflow task in this session. Start one with /devflow:run, or continue one with /devflow:run --resume <task>.' }
    const s = view.state
    const isAgentRunning = (await read($, agents)).some(agent => agent.endedAt === undefined)
    const waiting = activity(s.waitingFor, { ...(await read($, main)), isAgentRunning }) === 'waiting' ? ` · waiting for you: ${s.waitingFor ?? 'your answer'}` : ''

    return { text: `devflow · ${s.title ?? s.task ?? view.path} · ${s.tier ?? '?'} · ${s.phase ?? '?'} › ${s.step ?? '-'}${waiting}` }
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    if (started.agentId) {
      const row: AgentRow = {
        id: started.agentId,
        type: e.subagentType,
        model: started.model,
        label: e.description,
        startedAt: await $.clock.now(),
        tools: 0,
        recent: [],
      }
      const at = row.startedAt
      await update($, agents, list =>
        [...list.filter(agent => agent.endedAt === undefined || at - agent.endedAt < 30 * 60 * 1000), row].slice(-14),
      )
    }

    return started
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    // a task this session starts, resumes or reviews, here or in another repository: show it now
    const touched = flowTasksIn(e as unknown as Record<string, unknown>)
    const known = await read($, tasks)
    const added = touched.filter(folder => !known.includes(folder))
    if (added.length > 0) {
      await update($, tasks, list => [...list, ...added])
      await poll($)
    }
    // a question dialog on the main loop: the turn runs, but it waits for the developer
    if (!e.agentId && e.tool === 'AskUserQuestion') {
      await update($, main, state => ({ ...state, isAsking: true }))
      try {
        return await next(e)
      } finally {
        await update($, main, state => ({ ...state, isAsking: false }))
      }
    }
    if (e.agentId) {
      const id = e.agentId
      const action = describeCall(String(e.tool), e as unknown as Record<string, unknown>)
      await update($, agents, list =>
        list.map(agent =>
          agent.id === id ? { ...agent, tools: agent.tools + 1, recent: [...agent.recent, action].slice(-6) } : agent,
        ),
      )
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.start', async ($, e, next) => {
    if (!e.agentId) {
      const at = await $.clock.now()
      await update($, main, () => ({ isWorking: true, isAsking: false, turnStartedAt: at }))
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId) {
      const id = e.agentId
      const at = await $.clock.now()
      await update($, agents, list => list.map(agent => (agent.id === id ? { ...agent, endedAt: at } : agent)))
    } else {
      const at = await $.clock.now()
      await update($, main, state => ({ ...state, isWorking: false, isAsking: false, turnEndedAt: at }))
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const view = await read($, flow)
    const list = await read($, agents)
    const at = (await read($, now)) || (await $.clock.now())
    const running = list.filter(agent => agent.endedAt === undefined)
    const hasFlow = view !== null && isActive(view, at)
    if (e.props.hasSurvey || (!hasFlow && running.length === 0)) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const s = view?.state ?? {}
    const { isAsking } = await read($, main)
    const doing = activity(hasFlow ? s.waitingFor : undefined, { isWorking: e.props.isWorking, isAsking, isAgentRunning: running.length > 0 })
    const stopped = hasFlow && isStopped(s, doing, running.length)
    const upcoming = nextPhase(s)

    return (
      <Box flexDirection="column" marginTop={1}>
        <Text wrap="truncate-end">
          <Text color={ACCENT} bold>
            ◆ devflow{'  '}
          </Text>
          {hasFlow && <Text bold>{s.title ?? s.task}</Text>}
          {hasFlow && s.tier && (
            <Text>
              {'  '}
              <Text backgroundColor={hex(TIER_COLOR[s.tier] ?? COLORS.other)} color="#0b0d10" bold>
                {` ${s.tier.toUpperCase()} `}
              </Text>
            </Text>
          )}
          {hasFlow && s.reviewDepth && <Text dimColor>{`  review ${s.reviewDepth}`}</Text>}
        </Text>
        {hasFlow && (
          <Text wrap="truncate-end">
            {PHASES.map((phase, i) => {
              const mark = phaseMark(s, phase)
              return (
                <Text>
                  {i > 0 && <Text color={RAIL_COLOR[mark === 'pending' ? 'pending' : 'done']} dimColor={mark === 'pending'}>{' ── '}</Text>}
                  <Text
                    color={mark === 'current' ? (stopped ? 'warning' : ACCENT) : RAIL_COLOR[mark]}
                    bold={mark === 'current'}
                    dimColor={mark === 'pending' || mark === 'skipped'}
                    strikethrough={mark === 'skipped'}
                  >
                    {mark === 'current' && stopped ? '⏸ ' : RAIL_GLYPH[mark]}
                    {phase}
                    {mark === 'current' && s.step ? ` › ${stepLabel(s.step, s)}` : ''}
                  </Text>
                </Text>
              )
            })}
          </Text>
        )}
        {doing === 'waiting' && (
          <Text wrap="truncate-end">
            <Text backgroundColor={hex(COLORS.medium)} color="#0b0d10" bold>
              {' ⏸ WAITING FOR YOU '}
            </Text>
            <Text color="warning" bold>{`  ${s.waitingFor ?? 'your answer'}`}</Text>
          </Text>
        )}
        {doing !== 'waiting' && running.length > 0 && (
          <Text wrap="truncate-end">
            <Text color={WORKING} bold>
              {'● working'}
            </Text>
            <Text dimColor>{`  ·  ${running.map(agent => `${roleOf(agent.type)} ${ago(at - agent.startedAt)}`).join(' · ')}`}</Text>
          </Text>
        )}
        {doing === 'working' && running.length === 0 && (
          <Text color={WORKING} bold>
            {'● working'}
          </Text>
        )}
        {stopped && (
          <Text wrap="truncate-end">
            <Text color="warning" bold>
              {'⏸ stopped'}
            </Text>
            <Text dimColor>{upcoming ? `  ·  next: ${upcoming}` : ''}</Text>
            <Text dimColor>{'  ·  continue with '}</Text>
            <Text bold>{`/devflow:run --resume ${s.task ?? ''}`.trim()}</Text>
          </Text>
        )}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    lastPaneDraw = await $.clock.now()
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const Raster = 'Raster' in ui ? ui.Raster : undefined
    const view = await read($, flow)
    const list = await read($, agents)
    const at = (await read($, now)) || lastPaneDraw
    const width = Math.max(32, e.props.bodyColumns)
    const barWidth = Math.max(10, Math.min(36, width - 26))

    const bar = (key: string, cells: Cell[]) =>
      Raster ? (
        <Raster key={key} columns={cells.length} rows={1} cells={encodeCells(cells)} />
      ) : (
        <Text>{cells.map(cell => cell.char).join('')}</Text>
      )

    const heading = (title: string, note?: string) => {
      const label = ` ${title.toUpperCase()} `
      const tail = note ? ` ${note} ` : ''
      const rule = '─'.repeat(Math.max(2, width - label.length - tail.length - 2))
      return (
        <Text>
          <Text dimColor>──</Text>
          <Text color="claude" bold>
            {label}
          </Text>
          <Text dimColor>{rule}</Text>
          <Text dimColor>{tail}</Text>
        </Text>
      )
    }

    const chip = (text: string, color: number) => (
      <Text backgroundColor={hex(color)} color="#0b0d10" bold>
        {` ${text} `}
      </Text>
    )

    // the lanes share one time axis, from the first agent's start to now
    const timeAxis = (
      <Text dimColor>
        {' '.repeat(17)}
        {barWidth >= 18 ? `◂ first start${'now ▸'.padStart(barWidth - 13)}` : ''}
      </Text>
    )
    const agentRows = (rows: AgentRow[], from: number) =>
      rows.map(agent => {
        const status = agentStatus(agent, at)
        const isRunning = status.isRunning
        const color = hex(roleColor(agent.type))
        const line = isRunning ? agent.narration ?? agent.recent.at(-1) ?? agent.label : `${agent.label} · ${agent.tools} tool calls`
        return (
          <Box flexDirection="column">
            <Box>
              <Text color={isRunning ? color : 'success'} bold>{isRunning ? '● ' : '✓ '}</Text>
              <Text bold={isRunning} dimColor={!isRunning}>
                {roleOf(agent.type).slice(0, 14).padEnd(15)}
              </Text>
              {bar(`lane-${agent.id}`, laneCells(barWidth, from, at, agent.startedAt, agent.endedAt, roleColor(agent.type)))}
              <Text color={isRunning ? 'claude' : undefined} dimColor={!isRunning} bold={isRunning}>{`  ${status.text}`}</Text>
            </Box>
            <Text dimColor italic={isRunning} wrap="truncate-end">
              {'  ↳ '}
              {line}
            </Text>
          </Box>
        )
      })

    // the main session, the coordinator, drawn first and marked as main
    const mainState = await read($, main)
    const mainRow = (from: number, waitingFor?: string | null) => {
      if (mainState.turnStartedAt === undefined) return null
      const runningRoles = list.filter(agent => agent.endedAt === undefined).map(agent => roleOf(agent.type))
      const { tone: doing, text: status } = mainStatus(waitingFor, mainState, runningRoles, at)
      const ended = mainState.isWorking ? undefined : mainState.turnEndedAt
      return (
        <Box flexDirection="column">
          <Box>
            <Text color="claude" bold>
              {'◆ '}
            </Text>
            <Text bold>{'main'.padEnd(15)}</Text>
            {bar('lane-main', laneCells(barWidth, from, at, Math.max(from, mainState.turnStartedAt), ended, 0xd77757))}
            <Text color={doing === 'waiting' ? 'warning' : doing === 'working' ? WORKING : undefined} dimColor={doing === 'idle'} bold={doing !== 'idle'}>
              {`  ${status}`}
            </Text>
          </Box>
          <Text dimColor wrap="truncate-end">
            {'  ↳ your session, the coordinator'}
          </Text>
        </Box>
      )
    }

    // the axis starts at the earliest of the shown agents and the main session's current turn
    const timelineStart = (rows: AgentRow[]) =>
      Math.min(...rows.map(agent => agent.startedAt), mainState.turnStartedAt ?? at, at)

    const agentCounts = (rows: AgentRow[]) => {
      const runningCount = rows.filter(agent => agent.endedAt === undefined).length
      return `${runningCount} running · ${rows.length - runningCount} done`
    }

    const info = await read($, session)
    const meter = (key: string, label: string, percent: number, note: string) => (
      <Box>
        <Text dimColor>{` ${label.padEnd(8)}`}</Text>
        {bar(key, barCells(barWidth, scaled(percent, 100, barWidth), loadColor(percent)))}
        <Text bold>{` ${String(Math.round(percent)).padStart(3)}%`}</Text>
        <Text dimColor>{note ? `  ${note}` : ''}</Text>
      </Box>
    )
    const resetIn = (iso?: string) => {
      const when = iso ? Date.parse(iso) : NaN
      return Number.isNaN(when) ? '' : `resets in ${ago(when - at)}`
    }
    const sessionBlock = info && (
      <Box flexDirection="column">
        {heading('Session', info.startedAt ? ago(at - info.startedAt) : undefined)}
        <Text wrap="truncate-end">
          <Text dimColor>{' model   '}</Text>
          <Text bold>{info.model ?? 'unknown'}</Text>
          {info.effort && <Text dimColor>{'  effort '}</Text>}
          {info.effort && <Text bold>{info.effort}</Text>}
          {info.costUsd !== undefined && <Text dimColor>{`  ·  $${info.costUsd.toFixed(2)}`}</Text>}
        </Text>
        {info.contextPercent !== undefined &&
          meter(
            'ctx',
            'context',
            info.contextPercent,
            info.contextTokens !== undefined && info.contextWindow ? `${tokens(info.contextTokens)} / ${tokens(info.contextWindow)}` : '',
          )}
        {info.rateLimits.map(limit => meter(`rl-${limit.kind}`, windowLabel(limit.kind), limit.percentUsed, resetIn(limit.resetsAt)))}
      </Box>
    )

    if (!view) {
      return (
        <Box flexDirection="column" gap={1}>
          <Text>
            <Text color="claude" bold>
              ◆ devflow
            </Text>
            <Text dimColor>{'  no active task in this session · start one with /devflow:run'}</Text>
          </Text>
          {sessionBlock}
          {(list.length > 0 || mainState.turnStartedAt !== undefined) && (
            <Box flexDirection="column">
              {heading('Agents', agentCounts(list.slice(-8)))}
              {timeAxis}
              <Box flexDirection="column" gap={1}>
                {mainRow(timelineStart(list.slice(-8)))}
                {agentRows(list.slice(-8), timelineStart(list.slice(-8)))}
              </Box>
            </Box>
          )}
        </Box>
      )
    }

    const s = view.state
    const runningCount = list.filter(agent => agent.endedAt === undefined).length
    const doing = activity(s.waitingFor, { ...(await read($, main)), isAgentRunning: runningCount > 0 })
    const stopped = isStopped(s, doing, runningCount)
    const nextStep = nextPhase(s)
    const review = s.review
    const findings = review?.findings ?? []
    const openPaths = new Set(findings.filter(f => f.status !== 'fixed').map(f => (f.path ?? '').split(':')[0]))
    const shown = list.slice(-8)
    const from = timelineStart(shown)

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text>
            <Text color="claude" bold>
              ◆{' '}
            </Text>
            <Text bold>{s.title ?? s.task}</Text>
          </Text>
          <Text>
            {'  '}
            {s.tier && chip(s.tier.toUpperCase(), TIER_COLOR[s.tier] ?? COLORS.other)}
            {s.reviewDepth && <Text>{' '}{chip(`review ${s.reviewDepth}`, COLORS.review)}</Text>}
            {review?.round && <Text>{' '}{chip(`round ${review.round}/2`, COLORS.plan)}</Text>}
            <Text dimColor>{`  updated ${ago(at - view.mtimeMs)} ago`}</Text>
          </Text>
          {doing === 'waiting' && (
            <Text>
              {'  '}
              {chip('⏸ WAITING FOR YOU', COLORS.medium)}
              <Text color="warning" bold>{`  ${s.waitingFor ?? 'your answer'}`}</Text>
            </Text>
          )}
          {doing === 'working' && (
            <Text color={WORKING} bold>
              {'  ● working'}
            </Text>
          )}
          {s.phase === 'done' && (
            <Text color="success" bold>
              {'  ✓ finished'}
            </Text>
          )}
          {stopped && (
            <Text wrap="truncate-end">
              <Text color="warning" bold>
                {'  ⏸ stopped'}
              </Text>
              <Text dimColor>{nextStep ? `  ·  next: ${nextStep}` : ''}</Text>
              <Text dimColor>{'  ·  continue with '}</Text>
              <Text bold>{`/devflow:run --resume ${s.task ?? ''}`.trim()}</Text>
            </Text>
          )}
        </Box>

        {sessionBlock}

        <Box flexDirection="column">
          {heading('Flow')}
          {PHASES.map((phase, i) => {
            const mark = phaseMark(s, phase)
            const steps = mark === 'current' ? currentSteps(s) : []
            const nextMark = i < PHASES.length - 1 ? phaseMark(s, PHASES[i + 1]!) : 'pending'
            const detail =
              mark === 'skipped'
                ? 'skipped'
                : mark === 'current' && stopped
                  ? 'stopped'
                  : phase === 'plan' && mark === 'done'
                    ? 'approved'
                    : phase === 'implement' && (s.parts ?? []).length > 0
                      ? `${(s.parts ?? []).filter(part => part.status === 'done').length}/${(s.parts ?? []).length} parts`
                      : phase === 'finish' && (s.followUps ?? []).length > 0
                        ? `${(s.followUps ?? []).filter(item => item.status !== 'working').length}/${(s.followUps ?? []).length} follow-ups`
                        : ''
            const currentColor = stopped ? 'warning' : 'claude'
            return (
              <Box flexDirection="column">
                <Text>
                  <Text color={mark === 'current' ? currentColor : RAIL_COLOR[mark]} bold>
                    {mark === 'done' ? ' ✓ ' : mark === 'current' ? (stopped ? ' ⏸ ' : ' ◉ ') : mark === 'skipped' ? ' – ' : ' ○ '}
                  </Text>
                  <Text color={mark === 'pending' || mark === 'skipped' ? 'inactive' : 'text'} bold={mark === 'current'}>
                    {phase.padEnd(11)}
                  </Text>
                  <Text dimColor>{detail}</Text>
                </Text>
                {steps.map((step, j) => {
                  const isCurrent = step.mark === 'current'
                  const hint = isCurrent ? stepHint(step.name) : ''
                  return (
                    <Text wrap="truncate-end">
                      <Text color={RAIL_COLOR[mark]}>{' ┃'}</Text>
                      <Text dimColor>{j === steps.length - 1 ? '   └─ ' : '   ├─ '}</Text>
                      <Text color={isCurrent ? currentColor : RAIL_COLOR[step.mark]} bold={isCurrent} dimColor={step.mark === 'pending'}>
                        {step.mark === 'done' ? '✓ ' : isCurrent ? (stopped ? '⏸ ' : '● ') : '○ '}
                        {stepLabel(step.name, s)}
                      </Text>
                      <Text dimColor>{hint ? `  ${hint}` : ''}</Text>
                    </Text>
                  )
                })}
                {i < PHASES.length - 1 && (
                  <Text color={RAIL_COLOR[nextMark === 'pending' ? 'pending' : 'done']} dimColor={nextMark === 'pending'}>
                    {nextMark === 'pending' ? ' ┊' : ' ┃'}
                  </Text>
                )}
              </Box>
            )
          })}
        </Box>

        {view.guide && view.guide.total > 0 && (
          <Box flexDirection="column">
            {heading('Your review', `${view.guide.done}/${view.guide.total} checked`)}
            <Box>
              <Text>{' '}</Text>
              {bar('guide', barCells(barWidth, scaled(view.guide.done, view.guide.total, barWidth), view.guide.done === view.guide.total ? COLORS.verifier : COLORS.review))}
            </Box>
            <Text dimColor wrap="truncate-end">{` tick the boxes in ${view.guide.path}`}</Text>
          </Box>
        )}

        {(s.parts ?? []).length > 0 && (
          <Box flexDirection="column">
            {heading('Parts')}
            {(s.parts ?? []).map(part => {
              const color = PART_COLOR[part.status] ?? 'claude'
              return (
                <Text wrap="truncate-end">
                  <Text color={color} bold>
                    {` ${PART_GLYPH[part.status] ?? '▸'} `}
                  </Text>
                  <Text>{`${part.n}. ${part.title}`}</Text>
                  <Text dimColor>{`  ${[part.layer, part.agent].filter(Boolean).join(' · ')}`}</Text>
                </Text>
              )
            })}
          </Box>
        )}

        {(shown.length > 0 || mainState.turnStartedAt !== undefined) && (
          <Box flexDirection="column">
            {heading('Agents', agentCounts(shown))}
            {timeAxis}
            <Box flexDirection="column" gap={1}>
              {mainRow(from, s.waitingFor)}
              {agentRows(shown, from)}
            </Box>
          </Box>
        )}

        {review && (review.candidates ?? 0) > 0 && (
          <Box flexDirection="column">
            {heading('Review funnel')}
            {(
              [
                ['candidates', review.candidates ?? 0, COLORS.other],
                ['confirmed', review.confirmed ?? 0, COLORS.confirmed],
                ['refuted', review.refuted ?? 0, COLORS.refuted],
                ['unsettled', review.unsettled ?? 0, COLORS.unsettled],
              ] as const
            ).map(([name, value, color]) => (
              <Box>
                <Text dimColor={value === 0}>{` ${name.padEnd(12)}`}</Text>
                {bar(`funnel-${name}`, barCells(barWidth, scaled(value, review.candidates ?? 0, barWidth), color))}
                <Text bold={value > 0}>{` ${String(value).padStart(3)}`}</Text>
              </Box>
            ))}
          </Box>
        )}

        {findings.length > 0 && (
          <Box flexDirection="column">
            {heading('Findings', `${findings.filter(f => f.status === 'open').length} open`)}
            <Text>
              {' '}
              {SEVERITIES.map(severity => {
                const count = findings.filter(f => f.severity === severity).length
                return count > 0 ? (
                  <Text>
                    {chip(`${severity} ${count}`, COLORS[severity])}
                    {' '}
                  </Text>
                ) : null
              })}
            </Text>
            {findings.map(f => {
              const isDone = f.status === 'fixed' || f.status === 'kept'
              return (
                <Text wrap="truncate-end" dimColor={isDone}>
                  <Text bold>{` ${f.id.padEnd(4)}`}</Text>
                  <Text color={hex(COLORS[(f.severity ?? 'low') as (typeof SEVERITIES)[number]] ?? COLORS.low)}>
                    {(f.severity ?? '').padEnd(9)}
                  </Text>
                  <Text dimColor>{(f.action ?? '').padEnd(10)}</Text>
                  <Text strikethrough={isDone}>{f.path ?? ''}</Text>
                  <Text dimColor>{f.status && f.status !== 'open' ? `  ${f.status}` : ''}</Text>
                </Text>
              )
            })}
          </Box>
        )}

        {(s.blastRadius ?? []).length > 0 && (
          <Box flexDirection="column">
            {heading('Blast radius')}
            <Text dimColor> this change</Text>
            {(s.blastRadius ?? []).map((item, i, all) => (
              <Text wrap="truncate-end">
                <Text dimColor>{i === all.length - 1 ? ' └─▸ ' : ' ├─▸ '}</Text>
                <Text color={openPaths.has(item.path) ? 'error' : 'text'} bold={openPaths.has(item.path)}>
                  {item.path}
                </Text>
                <Text dimColor>{item.why ? `  ${item.why}` : ''}</Text>
              </Text>
            ))}
          </Box>
        )}

        {Object.keys(s.checks ?? {}).length > 0 && (
          <Box flexDirection="column">
            {heading('Checks')}
            {Object.entries(s.checks ?? {}).map(([command, result]) => (
              <Text wrap="truncate-end">
                <Text color={result === 'pass' ? 'success' : result === 'fail' ? 'error' : 'inactive'} bold>
                  {result === 'pass' ? ' ✓ ' : result === 'fail' ? ' ✗ ' : ' – '}
                </Text>
                <Text>{command}</Text>
                <Text dimColor>{result === 'pass' || result === 'fail' ? '' : `  ${result}`}</Text>
              </Text>
            ))}
          </Box>
        )}

        {((s.assumptions ?? []).length > 0 || (s.escalations ?? []).length > 0) && (
          <Box flexDirection="column">
            {heading('Assumptions & escalations')}
            {(s.assumptions ?? []).map(item => (
              <Box>
                <Text color="warning" bold>
                  {' ? '}
                </Text>
                <Box flexShrink={1}>
                  <Text wrap="wrap">{item}</Text>
                </Box>
              </Box>
            ))}
            {(s.escalations ?? []).map(item => (
              <Box>
                <Text color="suggestion" bold>
                  {' ↑ '}
                </Text>
                <Box flexShrink={1}>
                  <Text wrap="wrap">{item}</Text>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    )
  })
}
