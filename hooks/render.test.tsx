import { expect, mock, test } from 'claude-code/testing'

import type { FlowView } from '../types'

const SAMPLE: FlowView = {
  path: '.flow/order-status/state.json',
  mtimeMs: 1_000,
  state: {
    task: 'order-status',
    title: 'Order status endpoint',
    tier: 'light',
    reviewDepth: 'deep',
    phase: 'review',
    step: 'verify',
    waitingFor: 'decision on F1',
    parts: [{ n: 1, title: 'Order status endpoint', layer: 'be', agent: 'implementer-be', status: 'done' }],
    checks: { 'npm test': 'pass', 'npm run lint': 'skipped: no lint script' },
    assumptions: ['status is always set on stored orders'],
    escalations: ['light → full: needs a migration'],
    blastRadius: [{ path: 'src/client/api.js', why: 'reads the error shape' }],
    review: {
      round: 1,
      candidates: 3,
      confirmed: 1,
      refuted: 1,
      unsettled: 1,
      findings: [{ id: 'F1', severity: 'high', action: 'needs-you', status: 'open', path: 'src/client/api.js:4' }],
    },
  },
}


type TestOn = Parameters<Extract<Parameters<typeof test>[1], (...args: never[]) => unknown>>[1]

function answerStartup(on: TestOn) {
  on('tool.call', () => ({ result: 'ok' }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true as const } }))
  on('ui.toast', () => ({ value: undefined }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('settings.read', () => ({ value: { effortLevel: 'high' } }))
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 108_000, window: 200_000, percent: 54 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 23, resetsAt: '1970-01-01T01:00:00Z' }],
      cost: { usd: 1.23 },
    },
  }))
}

const PANE_PROPS = {
  title: 'devflow',
  isFocused: false,
  bodyColumns: 70,
  placement: 'dock' as const,
  scroll: { offset: 0, bodyRows: 60 },
  view: {},
}

const BAND_PROPS = {
  hasSurvey: false,
  isWorking: true,
  maxRows: 10,
  bodyColumns: 120,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
}

test('pane and band draw a task on every surface', async ($, on) => {
  mock.clock(on, { now: 61_000 })
  on('fs.exists', ($, e) => ({ value: e.path.endsWith('.flow') }))
  on('fs.list', ($, e) => ({
    value: e.path.endsWith('.flow') ? [{ name: 'order-status', kind: 'dir' as const, size: 0, mtimeMs: 0, isLink: false }] : [],
  }))
  on('fs.stat', () => ({ value: { kind: 'file' as const, size: 100, mtimeMs: SAMPLE.mtimeMs, isLink: false } }))
  on('fs.read', () => ({ value: JSON.stringify(SAMPLE.state) }))
  answerStartup(on)
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Read', file_path: '/repo/.flow/order-status/agents/state.json' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const pane = await $.ui.mount({ plugin: 'devflow', surface, component: 'Pane', requestId: 'devflow', props: PANE_PROPS })
    await pane.drawn()
    expect(await pane.find({ text: /Order status endpoint/ })).toBeDefined()
    expect(await pane.find({ text: /decision on F1/ })).toBeDefined()
    expect(await pane.find({ text: /src\/client\/api\.js/ })).toBeDefined()
    // long assumptions wrap instead of being cut off with an ellipsis
    const assumption = await pane.find({ type: 'Text', text: /status is always set on stored orders/ })
    expect(assumption?.props.wrap).toBe('wrap')
    await pane.unmount()

    const band = await $.ui.mount({ plugin: 'devflow', surface, component: 'AbovePrompt', props: { ...BAND_PROPS, isWorking: false } })
    await band.drawn()
    expect(await band.find({ text: /WAITING FOR YOU/ })).toBeDefined()
    await band.unmount()
  }
})

test('the band says working, not waiting, while a turn runs after the answer', async ($, on) => {
  mock.clock(on, { now: 61_000 })
  on('fs.exists', ($, e) => ({ value: e.path.endsWith('.flow') }))
  on('fs.list', ($, e) => ({
    value: e.path.endsWith('.flow') ? [{ name: 'order-status', kind: 'dir' as const, size: 0, mtimeMs: 0, isLink: false }] : [],
  }))
  on('fs.stat', () => ({ value: { kind: 'file' as const, size: 100, mtimeMs: SAMPLE.mtimeMs, isLink: false } }))
  on('fs.read', () => ({ value: JSON.stringify(SAMPLE.state) }))
  answerStartup(on)
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Read', file_path: '/repo/.flow/order-status/agents/state.json' })

  const band = await $.ui.mount({ plugin: 'devflow', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND_PROPS, isWorking: true } })
  await band.drawn()
  expect(await band.find({ text: /WAITING FOR YOU/ })).toBeUndefined()
  expect(await band.find({ text: /working/ })).toBeDefined()
  // set apart from Claude's orange spinner above it: a blank line and devflow's own colours
  expect((await band.find({ type: 'Box' }))?.props.marginTop).toBe(1)
  expect((await band.find({ type: 'Text', text: /^◆ devflow\s*$/ }))?.props.color).toBe('#ffc629')
  await band.unmount()
})

test('the pane shows the session without a devflow task', async ($, on) => {
  mock.clock(on, { now: 61_000 })
  on('fs.exists', () => ({ value: false }))
  answerStartup(on)
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const pane = await $.ui.mount({ plugin: 'devflow', surface, component: 'Pane', requestId: 'devflow', props: PANE_PROPS })
    expect(await pane.find({ text: /no active task/ })).toBeDefined()
    expect(await pane.find({ text: /claude-opus-5-5/ })).toBeDefined()
    expect(await pane.find({ text: /108k \/ 200k/ })).toBeDefined()
    expect(await pane.find({ text: /\$1\.23/ })).toBeDefined()
    await pane.unmount()
  }
})

test('the agents section lists the main session, marked as main', async ($, on) => {
  mock.clock(on, { now: 61_000 })
  on('fs.exists', ($, e) => ({ value: e.path.endsWith('.flow') }))
  on('fs.list', ($, e) => ({
    value: e.path.endsWith('.flow') ? [{ name: 'order-status', kind: 'dir' as const, size: 0, mtimeMs: 0, isLink: false }] : [],
  }))
  on('fs.stat', () => ({ value: { kind: 'file' as const, size: 100, mtimeMs: SAMPLE.mtimeMs, isLink: false } }))
  on('fs.read', () => ({ value: JSON.stringify(SAMPLE.state) }))
  answerStartup(on)
  on('turn.start', () => ({ turnId: 't1' }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Read', file_path: '/repo/.flow/order-status/agents/state.json' })
  await $.turn.start({ text: 'answer', turnId: 't1' })

  const pane = await $.ui.mount({ plugin: 'devflow', surface: 'terminal', component: 'Pane', requestId: 'devflow', props: PANE_PROPS })
  await pane.drawn()
  expect(await pane.find({ type: 'Text', text: /^main/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /working/ })).toBeDefined()
  await pane.unmount()
})

test('a flow stopped mid-way says so and names the next step', async ($, on) => {
  const stopped = { task: 'perf', title: 'Perf audit', tier: 'full', reviewDepth: 'quick', phase: 'implement', step: 'integrate', parts: [{ n: 1, title: 'Audit', status: 'done' }] }
  mock.clock(on, { now: 61_000 })
  on('fs.exists', ($, e) => ({ value: e.path.endsWith('.flow') }))
  on('fs.list', ($, e) => ({ value: e.path.endsWith('.flow') ? [{ name: 'perf', kind: 'dir' as const, size: 0, mtimeMs: 0, isLink: false }] : [] }))
  on('fs.stat', () => ({ value: { kind: 'file' as const, size: 100, mtimeMs: SAMPLE.mtimeMs, isLink: false } }))
  on('fs.read', () => ({ value: JSON.stringify(stopped) }))
  answerStartup(on)
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Read', file_path: '/repo/.flow/perf/agents/state.json' })

  const band = await $.ui.mount({ plugin: 'devflow', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND_PROPS, isWorking: false } })
  await band.drawn()
  expect(await band.find({ type: 'Text', text: /stopped/ })).toBeDefined()
  expect(await band.find({ type: 'Text', text: /next: review/ })).toBeDefined()
  expect(await band.find({ type: 'Text', text: /\/devflow:run --resume perf/ })).toBeDefined()
  await band.unmount()

  const pane = await $.ui.mount({ plugin: 'devflow', surface: 'terminal', component: 'Pane', requestId: 'devflow', props: PANE_PROPS })
  await pane.drawn()
  expect(await pane.find({ type: 'Text', text: /final checks/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /▸/ })).toBeUndefined()
  await pane.unmount()
})

test('a terminal too narrow for the panel to open on its own gets told how to open it', async ($, on) => {
  const toasts: string[] = []
  mock.clock(on, { now: 61_000 })
  on('fs.exists', ($, e) => ({ value: e.path.endsWith('.flow') }))
  on('fs.list', ($, e) => ({
    value: e.path.endsWith('.flow') ? [{ name: 'order-status', kind: 'dir' as const, size: 0, mtimeMs: 0, isLink: false }] : [],
  }))
  on('fs.stat', () => ({ value: { kind: 'file' as const, size: 100, mtimeMs: 60_000, isLink: false } }))
  on('fs.read', () => ({ value: JSON.stringify({ ...SAMPLE.state, waitingFor: null }) }))
  on('tool.call', () => ({ result: 'ok' }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: false as const, reason: 'opened unasked below 144 columns (now 120)' } }))
  on('ui.toast', ($, e) => {
    toasts.push(String(e.text))
    return { value: undefined }
  })
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('settings.read', () => ({ value: {} }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 1, window: 2, percent: 50 }, rateLimits: [] } }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Read', file_path: '/repo/.flow/order-status/agents/state.json' })

  expect(toasts.some(text => text.includes('/devflow-status'))).toBe(true)
})

test('a task that only just started shows up before it is sized', async ($, on) => {
  const early = { task: 'perf', title: 'Perf audit', phase: 'plan', step: 'ground' }
  mock.clock(on, { now: 61_000 })
  on('fs.exists', ($, e) => ({ value: e.path.endsWith('.flow') }))
  on('fs.list', ($, e) => ({ value: e.path.endsWith('.flow') ? [{ name: 'perf', kind: 'dir' as const, size: 0, mtimeMs: 0, isLink: false }] : [] }))
  on('fs.stat', () => ({ value: { kind: 'file' as const, size: 100, mtimeMs: 60_000, isLink: false } }))
  on('fs.read', () => ({ value: JSON.stringify(early) }))
  answerStartup(on)
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Read', file_path: '/repo/.flow/perf/agents/state.json' })

  const pane = await $.ui.mount({ plugin: 'devflow', surface: 'terminal', component: 'Pane', requestId: 'devflow', props: PANE_PROPS })
  await pane.drawn()
  expect(await pane.find({ type: 'Text', text: /Perf audit/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /read the project/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /no active task/ })).toBeUndefined()
  await pane.unmount()
})

test('a task whose .flow lives in another repository stays on screen', async ($, on) => {
  const elsewhere = { task: 'pharmacy-list-lazy', title: 'Pharmacy list', tier: 'full', phase: 'plan', step: 'approve', waitingFor: 'plan approval' }
  mock.clock(on, { now: 61_000 })
  on('fs.exists', ($, e) => ({ value: e.path === '/work/fe-eshop/.flow' }))
  on('fs.list', ($, e) => ({
    value: e.path === '/work/fe-eshop/.flow' ? [{ name: 'pharmacy-list-lazy', kind: 'dir' as const, size: 0, mtimeMs: 0, isLink: false }] : [],
  }))
  on('fs.stat', ($, e) => ({ value: { kind: 'file' as const, size: 100, mtimeMs: 60_000, isLink: false } }))
  on('fs.read', ($, e) => ({ value: e.path.startsWith('/work/fe-eshop/.flow/') ? JSON.stringify(elsewhere) : '' }))
  answerStartup(on)
  await $.session.start({ cwd: '/work/be-api', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Write', file_path: '/work/fe-eshop/.flow/pharmacy-list-lazy/plan.md', content: '# plan' })

  const pane = await $.ui.mount({ plugin: 'devflow', surface: 'terminal', component: 'Pane', requestId: 'devflow', props: PANE_PROPS })
  await pane.drawn()
  expect(await pane.find({ type: 'Text', text: /Pharmacy list/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /no active task/ })).toBeUndefined()
  await pane.unmount()
})

test('a task in the new layout is found under agents/state.json', async ($, on) => {
  const task = { task: 'lazy', title: 'Lazy pharmacy list', tier: 'full', phase: 'implement', step: 'part 1' }
  mock.clock(on, { now: 61_000 })
  on('fs.exists', ($, e) => ({ value: e.path.endsWith('.flow') }))
  on('fs.list', ($, e) => ({ value: e.path.endsWith('.flow') ? [{ name: 'lazy', kind: 'dir' as const, size: 0, mtimeMs: 0, isLink: false }] : [] }))
  on('fs.stat', ($, e) => {
    if (!e.path.endsWith('.flow/lazy/agents/state.json')) throw new Error('ENOENT')
    return { value: { kind: 'file' as const, size: 100, mtimeMs: 60_000, isLink: false } }
  })
  on('fs.read', ($, e) => ({ value: e.path.endsWith('.flow/lazy/agents/state.json') ? JSON.stringify(task) : '' }))
  answerStartup(on)
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Read', file_path: '/repo/.flow/lazy/agents/state.json' })

  const pane = await $.ui.mount({ plugin: 'devflow', surface: 'terminal', component: 'Pane', requestId: 'devflow', props: PANE_PROPS })
  await pane.drawn()
  expect(await pane.find({ type: 'Text', text: /Lazy pharmacy list/ })).toBeDefined()
  await pane.unmount()
})

test('fixes asked for at the end show up as follow-ups under finish', async ($, on) => {
  const task = {
    task: 'lazy',
    title: 'Lazy pharmacy list',
    tier: 'full',
    phase: 'finish',
    step: 'follow-up 2',
    followUps: [
      { n: 1, ask: 'Make the badge red', status: 'done' },
      { n: 2, ask: 'Sort the list by date', status: 'working' },
    ],
  }
  mock.clock(on, { now: 61_000 })
  on('fs.exists', ($, e) => ({ value: e.path.endsWith('.flow') }))
  on('fs.list', ($, e) => ({ value: e.path.endsWith('.flow') ? [{ name: 'lazy', kind: 'dir' as const, size: 0, mtimeMs: 0, isLink: false }] : [] }))
  on('fs.stat', () => ({ value: { kind: 'file' as const, size: 100, mtimeMs: 60_000, isLink: false } }))
  on('fs.read', () => ({ value: JSON.stringify(task) }))
  answerStartup(on)
  on('turn.start', () => ({ turnId: 't1' }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Read', file_path: '/repo/.flow/lazy/agents/state.json' })
  await $.turn.start({ text: 'sort the list by date too', turnId: 't1' })

  const pane = await $.ui.mount({ plugin: 'devflow', surface: 'terminal', component: 'Pane', requestId: 'devflow', props: PANE_PROPS })
  await pane.drawn()
  expect(await pane.find({ type: 'Text', text: /1\/2 follow-ups/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /✓ follow-up 1 · Make the badge red/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /follow-up 2 · Sort the list by date/ })).toBeDefined()
  await pane.unmount()

  const band = await $.ui.mount({ plugin: 'devflow', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND_PROPS, isWorking: true } })
  await band.drawn()
  expect(await band.find({ type: 'Text', text: /finish › follow-up 2 · Sort the list by date/ })).toBeDefined()
  await band.unmount()
})

test('a task another session started stays hidden until this session works on it', async ($, on) => {
  const opened: string[] = []
  mock.clock(on, { now: 61_000 })
  on('fs.exists', ($, e) => ({ value: e.path.endsWith('.flow') }))
  on('fs.list', ($, e) => ({
    value: e.path.endsWith('.flow') ? [{ name: 'order-status', kind: 'dir' as const, size: 0, mtimeMs: 0, isLink: false }] : [],
  }))
  on('fs.stat', () => ({ value: { kind: 'file' as const, size: 100, mtimeMs: 60_000, isLink: false } }))
  on('fs.read', () => ({ value: JSON.stringify(SAMPLE.state) }))
  on('tool.call', () => ({ result: 'ok' }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('ui.open', ($, e) => {
    opened.push(String(e.id))
    return { value: { isPlaced: true as const } }
  })
  on('ui.toast', () => ({ value: undefined }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('settings.read', () => ({ value: {} }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 1, window: 2, percent: 50 }, rateLimits: [] } }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

  // a fresh session in a project where another session runs a devflow task (the band reads the same task)
  expect(opened).toEqual([])
  const pane = await $.ui.mount({ plugin: 'devflow', surface: 'terminal', component: 'Pane', requestId: 'devflow', props: PANE_PROPS })
  await pane.drawn()
  expect(await pane.find({ type: 'Text', text: /no active task/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /Order status endpoint/ })).toBeUndefined()
  await pane.unmount()

  // this session resumes it: from now on it is this session's task
  await $.tool.call({ tool: 'Read', file_path: '/repo/.flow/order-status/agents/state.json' })
  const resumed = await $.ui.mount({ plugin: 'devflow', surface: 'terminal', component: 'Pane', requestId: 'devflow', props: PANE_PROPS })
  await resumed.drawn()
  expect(await resumed.find({ type: 'Text', text: /Order status endpoint/ })).toBeDefined()
  await resumed.unmount()
})

test('the panel shows how far you are through the review guide', async ($, on) => {
  const task = { task: 'lazy', title: 'Lazy pharmacy list', tier: 'full', phase: 'finish', step: 'clean-up' }
  const guide = '# Review guide\n- [x] Is this what you wanted?\n- [ ] Does the cursor survive a refresh?\n- [ ] Try it\n'
  mock.clock(on, { now: 61_000 })
  on('fs.stat', () => ({ value: { kind: 'file' as const, size: 100, mtimeMs: 60_000, isLink: false } }))
  on('fs.read', ($, e) => ({ value: e.path.endsWith('review-guide.md') ? guide : JSON.stringify(task) }))
  answerStartup(on)
  on('turn.start', () => ({ turnId: 't1' }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Read', file_path: '/repo/.flow/lazy/agents/state.json' })
  await $.turn.start({ text: 'go on', turnId: 't1' })

  const pane = await $.ui.mount({ plugin: 'devflow', surface: 'terminal', component: 'Pane', requestId: 'devflow', props: PANE_PROPS })
  await pane.drawn()
  expect(await pane.find({ type: 'Text', text: /YOUR REVIEW/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /1\/3 checked/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /\/repo\/\.flow\/lazy\/review-guide\.md/ })).toBeDefined()
  await pane.unmount()
})

test('a finished task stays on the panel, marked finished, after its working files are deleted', async ($, on) => {
  const task = { task: 'lazy', title: 'Lazy pharmacy list', tier: 'full', phase: 'finish', step: 'clean-up' }
  let isDeleted = false
  const clock = mock.clock(on, { now: 61_000 })
  on('fs.stat', () => {
    if (isDeleted) throw new Error('ENOENT')
    return { value: { kind: 'file' as const, size: 100, mtimeMs: 60_000, isLink: false } }
  })
  on('fs.read', () => ({ value: JSON.stringify(task) }))
  answerStartup(on)
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Read', file_path: '/repo/.flow/lazy/agents/state.json' })

  // the clean-up deletes the folder, state.json with it
  isDeleted = true
  await clock.advance(2_500)

  const pane = await $.ui.mount({ plugin: 'devflow', surface: 'terminal', component: 'Pane', requestId: 'devflow', props: PANE_PROPS })
  await pane.drawn()
  expect(await pane.find({ type: 'Text', text: /no active task/ })).toBeUndefined()
  expect(await pane.find({ type: 'Text', text: /Lazy pharmacy list/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /✓ finished/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /stopped/ })).toBeUndefined()
  await pane.unmount()
})
