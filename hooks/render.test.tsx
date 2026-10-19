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

  for (const surface of ['terminal', 'desktop'] as const) {
    const pane = await $.ui.mount({ plugin: 'devflow', surface, component: 'Pane', requestId: 'devflow', props: PANE_PROPS })
    await pane.drawn()
    expect(await pane.find({ text: /Order status endpoint/ })).toBeDefined()
    expect(await pane.find({ text: /decision on F1/ })).toBeDefined()
    expect(await pane.find({ text: /src\/client\/api\.js/ })).toBeDefined()
    await pane.unmount()

    const band = await $.ui.mount({ plugin: 'devflow', surface, component: 'AbovePrompt', props: BAND_PROPS })
    await band.drawn()
    expect(await band.find({ text: /WAITING FOR YOU/ })).toBeDefined()
    await band.unmount()
  }
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
