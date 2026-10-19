import { expect, test } from 'claude-code/testing'

import { ago, barCells, currentSteps, describeCall, encodeCells, laneCells, phaseMark } from './model'

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

test('tool calls read as a short action', async () => {
  expect(describeCall('Read', { file_path: '/repo/src/orders/list.ts' })).toBe('Read orders/list.ts')
  expect(describeCall('Bash', { command: 'npm test' })).toBe('Bash npm test')
  expect(ago(65_000)).toBe('1m')
  expect(ago(3_900_000)).toBe('1h05')
})
