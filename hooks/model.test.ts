import { expect, test } from 'claude-code/testing'

import { activity, agentStatus, ago, flowRootsIn, mainStatus, nextPhase, stepHint, stepLabel, barCells, currentSteps, describeCall, encodeCells, laneCells, phaseMark } from './model'

function decode(base64: string): number[] {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const bytes: number[] = []
  const clean = base64.replace(/=+$/, '')
  for (let i = 0; i < clean.length; i += 4) {
    const n = [0, 1, 2, 3].reduce((acc, j) => (acc << 6) | Math.max(0, alphabet.indexOf(clean[i + j] ?? 'A')), 0)
    bytes.push((n >> 16) & 255, (n >> 8) & 255, n & 255)
  }
  const words: number[] = []
  for (let i = 0; i + 3 < bytes.length; i += 4) {
    words.push(((bytes[i + 3]! << 24) >>> 0) + (bytes[i + 2]! << 16) + (bytes[i + 1]! << 8) + bytes[i]!)
  }
  return words
}

test('phases before the current one are done, later ones pending', async () => {
  const state = { phase: 'review' }
  expect(phaseMark(state, 'plan')).toBe('done')
  expect(phaseMark(state, 'review')).toBe('current')
  expect(phaseMark(state, 'summary')).toBe('pending')
  expect(phaseMark({ phase: 'done' }, 'finish')).toBe('done')
})

test('review steps are marked against the current step', async () => {
  const steps = currentSteps({ phase: 'review', step: 'verify' })
  expect(steps.map(step => step.mark)).toEqual(['done', 'done', 'current', 'pending', 'pending', 'pending'])
})

test('implement steps follow the parts', async () => {
  const steps = currentSteps({
    phase: 'implement',
    parts: [
      { n: 1, title: 'be', status: 'done' },
      { n: 2, title: 'fe', status: 'running' },
    ],
  })
  expect(steps).toEqual([
    { name: 'part 1', mark: 'done' },
    { name: 'part 2', mark: 'current' },
    { name: 'integrate', mark: 'pending' },
  ])
})

test('cells encode as little-endian code point, foreground, background', async () => {
  const words = decode(encodeCells([{ char: '█', fg: 0xff8800 }]))
  expect(words).toEqual([0x2588, 0xff8800, 0x01000000])
})

test('bars and lanes keep their width', async () => {
  expect(barCells(10, 3, 0xffffff).filter(cell => cell.char === '█')).toHaveLength(3)
  const lane = laneCells(20, 0, 1000, 500, undefined, 0x00ff00)
  expect(lane).toHaveLength(20)
  expect(lane[0]!.char).toBe('·')
  expect(lane[19]!.char).toBe('▶')
})

test('waiting is shown only while the session waits, not from a stale state file', async () => {
  // the skill asked and the turn ended: waiting
  expect(activity('answers to scope questions', { isWorking: false, isAsking: false })).toBe('waiting')
  // the developer answered and Claude works on, though state.json still says waiting
  expect(activity('answers to scope questions', { isWorking: true, isAsking: false })).toBe('working')
  // a question dialog is open mid-turn, with or without waitingFor
  expect(activity(null, { isWorking: true, isAsking: true })).toBe('waiting')
  expect(activity(undefined, { isWorking: false, isAsking: false })).toBe('idle')
  // Claude's turn ended but its subagents work on in the background: working, not waiting
  expect(activity('answers to scope questions', { isWorking: false, isAsking: false, isAgentRunning: true })).toBe('working')
  // an open question still wins over background agents
  expect(activity(null, { isWorking: false, isAsking: true, isAgentRunning: true })).toBe('waiting')
})

test('an agent row says whether it is running or done, and for how long', async () => {
  expect(agentStatus({ startedAt: 0, endedAt: 120_000 }, 300_000)).toEqual({ isRunning: false, text: 'done in 2m' })
  expect(agentStatus({ startedAt: 0 }, 45_000)).toEqual({ isRunning: true, text: 'running 45s' })
})

test('sub-steps read in plain words, with a hint for what happens there', async () => {
  expect(stepLabel('integrate', {})).toBe('final checks')
  expect(stepLabel('builder-check', {})).toBe('plan check')
  expect(stepLabel('part 2', { parts: [{ n: 2, title: 'Status badge', status: 'running' }] })).toBe('part 2 · Status badge')
  expect(stepHint('integrate')).toBe('project checks over the whole change')
  expect(stepHint('part 1')).toBe('an implementer builds this part')
})

test('the next phase is the one after the current, skipping recorded skips', async () => {
  expect(nextPhase({ phase: 'implement' })).toBe('review')
  expect(nextPhase({ phase: 'implement', skipped: ['review'] })).toBe('summary')
  expect(nextPhase({ phase: 'finish' })).toBeUndefined()
  expect(nextPhase({ phase: 'done' })).toBeUndefined()
})

test('a skipped phase is marked as skipped, not done or pending', async () => {
  expect(phaseMark({ phase: 'summary', skipped: ['review'] }, 'review')).toBe('skipped')
})

test('the main row says what the main session waits on', async () => {
  const idle = { isWorking: false, isAsking: false, turnStartedAt: 0, turnEndedAt: 60_000 }
  // its turn ended while the plan-checker works in the background: it waits on that agent, not on you
  expect(mainStatus('answers to scope questions', idle, ['plan-checker'], 120_000)).toEqual({ tone: 'working', text: 'waiting on plan-checker' })
  expect(mainStatus('answers to scope questions', idle, [], 120_000)).toEqual({ tone: 'waiting', text: 'waiting for you' })
  expect(mainStatus(null, { ...idle, isAsking: true }, ['explorer'], 120_000)).toEqual({ tone: 'waiting', text: 'waiting for you' })
  expect(mainStatus(null, { ...idle, isWorking: true }, [], 120_000)).toEqual({ tone: 'working', text: 'working 2m' })
  expect(mainStatus(null, idle, [], 120_000)).toEqual({ tone: 'idle', text: 'idle 1m' })
})

test('a devflow task in another repository is found from the paths tools touch', async () => {
  expect(flowRootsIn({ file_path: '/work/fe-eshop/.flow/pharmacy-list-lazy/plan.md' })).toEqual(['/work/fe-eshop'])
  expect(flowRootsIn({ command: "cd /work/fe-eshop/.flow/pharmacy-list-lazy && python3 -I - <<'EOF'" })).toEqual(['/work/fe-eshop'])
  // the session's own .flow and paths without one add nothing
  expect(flowRootsIn({ file_path: '.flow/perf/state.json', command: 'npm test' })).toEqual([])
})

test('follow-ups asked for after the summary show up as steps of finish', async () => {
  const state = {
    phase: 'finish',
    step: 'follow-up 2',
    followUps: [
      { n: 1, ask: 'Make the badge red', status: 'done' },
      { n: 2, ask: 'Sort the list by date', status: 'working' },
      { n: 3, ask: 'Export to CSV', status: 'moved' },
    ],
  }
  expect(currentSteps(state)).toEqual([
    { name: 'follow-up 1', mark: 'done' },
    { name: 'follow-up 2', mark: 'current' },
    { name: 'follow-up 3', mark: 'done' },
  ])
  expect(stepLabel('follow-up 2', state)).toBe('follow-up 2 · Sort the list by date')
  expect(stepLabel('follow-up 3', state)).toBe('follow-up 3 · Export to CSV → new task')
  expect(stepHint('follow-up 2')).toBe('a change you asked for after the summary')
  expect(currentSteps({ phase: 'finish' })).toEqual([])
})

test('tool calls read as a short action', async () => {
  expect(describeCall('Read', { file_path: '/repo/src/orders/list.ts' })).toBe('Read orders/list.ts')
  expect(describeCall('Bash', { command: 'npm test' })).toBe('Bash npm test')
  expect(ago(65_000)).toBe('1m')
  expect(ago(3_900_000)).toBe('1h05')
})
