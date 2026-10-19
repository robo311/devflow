import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { AgentRow, FlowState, FlowView, SessionInfo } from '../types'
import {
  COLORS,
  PHASES,
  ago,
  barCells,
  currentSteps,
  describeCall,
  encodeCells,
  hex,
  laneCells,
  loadColor,
  phaseMark,
  roleColor,
  roleOf,
  scaled,
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

const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const
const RAIL_COLOR: Record<Mark, string> = { done: 'success', current: 'claude', pending: 'inactive' }
const TIER_COLOR: Record<string, number> = { trivial: COLORS.other, light: COLORS.explorer, full: COLORS.implement }
const PART_GLYPH: Record<string, string> = { done: '✓', blocked: '✗', partial: '◐', pending: '○', running: '▸' }
const PART_COLOR: Record<string, string> = { done: 'success', blocked: 'error', partial: 'warning', pending: 'inactive', running: 'claude' }

async function findFlow($: EngineInterface): Promise<{ path: string; mtimeMs: number } | null> {
  if (!(await $.fs.exists('.flow'))) return null
  const candidates: string[] = []
  for (const entry of await $.fs.list('.flow')) {
    if (entry.kind !== 'dir') continue
    if (entry.name === 'reviews') {
      for (const review of await $.fs.list('.flow/reviews')) {
        if (review.kind === 'dir') candidates.push(`.flow/reviews/${review.name}/state.json`)
      }
    } else {
      candidates.push(`.flow/${entry.name}/state.json`)
    }
  }
  let newest: { path: string; mtimeMs: number } | null = null
  for (const path of candidates) {
    const stat = await $.fs.stat(path).catch(() => undefined)
    if (stat && (!newest || stat.mtimeMs > newest.mtimeMs)) newest = { path, mtimeMs: stat.mtimeMs }
  }
  return newest
}

function isActive(view: FlowView | null, at: number): boolean {
  if (!view) return false
  if (view.state.phase !== 'done') return at - view.mtimeMs < 12 * 60 * 60 * 1000
  return at - view.mtimeMs < ACTIVE_MS
}

let narrationOn = true
let lastPaneDraw = 0
let openedFor = ''
const narratedCount = new Map<string, number>()

async function poll($: EngineInterface) {
  const at = await $.clock.now()
  const found = await findFlow($).catch(() => null)
  const held = await read($, flow)

  if (!found) {
    if (held) await update($, flow, () => null)
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
        void $.ui.open({ id: PANE, title: 'devflow' })
      }
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
      maxTokens: 40,
      timeoutMs: 8000,
      system: 'You narrate coding agents for a progress display. Reply with one short present-tense phrase, at most 9 words, no period.',
      prompt: `Agent role: ${roleOf(agent.type)}\nTask: ${agent.label}\nMost recent actions, oldest first:\n${agent.recent.join('\n')}\n\nWhat is it doing right now?`,
    })
    if (reply.isAnswered) {
      const text = reply.text.trim().split('\n')[0]?.slice(0, 80) ?? ''
      await update($, agents, rows => rows.map(row => (row.id === agent.id ? { ...row, narration: text } : row)))
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
    if (!view) return { text: 'No devflow task found in .flow/ of this project.' }
    const s = view.state
    const waiting = s.waitingFor ? ` · waiting for you: ${s.waitingFor}` : ''

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

  on('turn.complete', async ($, e, next) => {
    if (e.agentId) {
      const id = e.agentId
      const at = await $.clock.now()
      await update($, agents, list => list.map(agent => (agent.id === id ? { ...agent, endedAt: at } : agent)))
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

    return (
      <Box flexDirection="column">
        <Box>
          <Text color="claude" bold>
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
          {hasFlow && s.reviewDepth && <Text dimColor>{` review ${s.reviewDepth}`}</Text>}
          <Text>{'   '}</Text>
          {hasFlow &&
            PHASES.map((phase, i) => {
              const mark = phaseMark(s, phase)
              const rail = mark === 'pending' ? '┄┄' : '━━'
              return (
                <Text>
                  {i > 0 && <Text color={RAIL_COLOR[mark]}>{` ${rail} `}</Text>}
                  <Text color={RAIL_COLOR[mark]} bold={mark === 'current'} dimColor={mark === 'pending'}>
                    {mark === 'current' ? '◉ ' : ''}
                    {phase}
                    {mark === 'current' && s.step ? ` › ${s.step}` : ''}
                  </Text>
                </Text>
              )
            })}
          {running.length > 0 && (
            <Text dimColor>
              {'   '}⚙ {running.length} agent{running.length > 1 ? 's' : ''}
            </Text>
          )}
        </Box>
        {hasFlow && s.waitingFor && (
          <Text>
            <Text backgroundColor={hex(COLORS.medium)} color="#0b0d10" bold>
              {' ⏸ WAITING FOR YOU '}
            </Text>
            <Text color="warning" bold>{`  ${s.waitingFor}`}</Text>
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

    const agentRows = (rows: AgentRow[], from: number) =>
      rows.map(agent => {
        const isRunning = agent.endedAt === undefined
        const color = hex(roleColor(agent.type))
        const line = isRunning ? agent.narration ?? agent.recent.at(-1) ?? agent.label : `${agent.label} · ${agent.tools} tool calls`
        return (
          <Box flexDirection="column">
            <Box>
              <Text color={color}>{isRunning ? '● ' : '○ '}</Text>
              <Text bold={isRunning} dimColor={!isRunning}>
                {roleOf(agent.type).slice(0, 14).padEnd(15)}
              </Text>
              {bar(`lane-${agent.id}`, laneCells(barWidth, from, at, agent.startedAt, agent.endedAt, roleColor(agent.type)))}
              <Text dimColor>{` ${ago((agent.endedAt ?? at) - agent.startedAt).padStart(5)}`}</Text>
            </Box>
            <Text dimColor italic={isRunning} wrap="truncate-end">
              {'  ↳ '}
              {line}
            </Text>
          </Box>
        )
      })

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
            <Text dimColor>{'  no active task · start one with /devflow:run'}</Text>
          </Text>
          {sessionBlock}
          {list.length > 0 && (
            <Box flexDirection="column">
              {heading('Agents')}
              {agentRows(list.slice(-8), Math.min(...list.slice(-8).map(agent => agent.startedAt), at))}
            </Box>
          )}
        </Box>
      )
    }

    const s = view.state
    const review = s.review
    const findings = review?.findings ?? []
    const openPaths = new Set(findings.filter(f => f.status !== 'fixed').map(f => (f.path ?? '').split(':')[0]))
    const shown = list.slice(-8)
    const from = Math.min(...shown.map(agent => agent.startedAt), at)

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
          {s.waitingFor && (
            <Text>
              {'  '}
              {chip('⏸ WAITING FOR YOU', COLORS.medium)}
              <Text color="warning" bold>{`  ${s.waitingFor}`}</Text>
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
              phase === 'plan' && mark === 'done'
                ? 'approved'
                : phase === 'implement' && (s.parts ?? []).length > 0
                  ? `${(s.parts ?? []).filter(part => part.status === 'done').length}/${(s.parts ?? []).length} parts`
                  : ''
            return (
              <Box flexDirection="column">
                <Text>
                  <Text color={RAIL_COLOR[mark]} bold>
                    {mark === 'done' ? ' ✓ ' : mark === 'current' ? ' ◉ ' : ' ○ '}
                  </Text>
                  <Text color={mark === 'pending' ? 'inactive' : 'text'} bold={mark === 'current'}>
                    {phase.padEnd(11)}
                  </Text>
                  <Text dimColor>{detail}</Text>
                </Text>
                {steps.map(step => (
                  <Text>
                    <Text color={RAIL_COLOR[mark]}>{' ┃   '}</Text>
                    <Text color={RAIL_COLOR[step.mark]} bold={step.mark === 'current'} dimColor={step.mark === 'pending'}>
                      {step.mark === 'current' ? '▸ ' : step.mark === 'done' ? '✓ ' : '· '}
                      {step.name}
                    </Text>
                  </Text>
                ))}
                {i < PHASES.length - 1 && (
                  <Text color={RAIL_COLOR[nextMark === 'pending' ? 'pending' : 'done']} dimColor={nextMark === 'pending'}>
                    {nextMark === 'pending' ? ' ┊' : ' ┃'}
                  </Text>
                )}
              </Box>
            )
          })}
        </Box>

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

        {shown.length > 0 && (
          <Box flexDirection="column">
            {heading('Agents', `${shown.filter(agent => agent.endedAt === undefined).length} running`)}
            {agentRows(shown, from)}
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
              <Text wrap="truncate-end">
                <Text color="warning" bold>
                  {' ? '}
                </Text>
                <Text>{item}</Text>
              </Text>
            ))}
            {(s.escalations ?? []).map(item => (
              <Text wrap="truncate-end">
                <Text color="suggestion" bold>
                  {' ↑ '}
                </Text>
                <Text>{item}</Text>
              </Text>
            ))}
          </Box>
        )}
      </Box>
    )
  })
}
