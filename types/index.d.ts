export type FlowPart = {
  n: number
  title: string
  layer?: string
  agent?: string
  status: string
  /** When its implementer was dispatched and when its report came back (ISO). */
  startedAt?: string
  finishedAt?: string
}

/** A fix or addition the developer asked for after the summary; `moved` went to a task of its own. */
export type FlowFollowUp = { n: number; ask: string; status: 'working' | 'done' | 'moved' | string }

export type FlowFinding = {
  id: string
  severity?: string
  action?: string
  status?: string
  path?: string
}

export type FlowState = {
  task?: string
  title?: string
  tier?: string
  reviewDepth?: string
  phase?: string
  step?: string
  waitingFor?: string | null
  /** Phases deliberately left out, such as `review` for a task that changed no code. */
  skipped?: string[]
  updatedAt?: string
  /** When each phase began (ISO), `done` included, so the time each took can be read back. */
  phaseStarts?: Record<string, string>
  /** When the open wait for the developer began (ISO), while `waitingFor` is set. */
  waitingSince?: string | null
  /** Seconds each phase spent waiting for the developer. */
  waited?: Record<string, number>
  parts?: FlowPart[]
  followUps?: FlowFollowUp[]
  checks?: Record<string, string>
  assumptions?: string[]
  escalations?: string[]
  blastRadius?: { path: string; why?: string }[]
  review?: {
    round?: number
    candidates?: number
    confirmed?: number
    refuted?: number
    unsettled?: number
    findings?: FlowFinding[]
  }
}

export type FlowView = {
  path: string
  mtimeMs: number
  state: FlowState
  /** `review-guide.md` next to the task's files: its path and how many of its boxes are ticked. */
  guide?: { path: string; mtimeMs: number; done: number; total: number }
}

export type AgentRow = {
  id: string
  type: string
  model: string
  label: string
  startedAt: number
  endedAt?: number
  tools: number
  recent: string[]
  narration?: string
}

export type SessionInfo = {
  model?: string
  effort?: string
  contextTokens?: number
  contextWindow?: number
  contextPercent?: number
  costUsd?: number
  startedAt?: number
  rateLimits: { kind: string; percentUsed: number; resetsAt?: string }[]
}

declare module 'claude-code' {
  interface PluginState {
    devflow: {
      flow: FlowView | null
      agents: AgentRow[]
      now: number
      session: SessionInfo | null
      /** The main loop: a turn is running, an AskUserQuestion dialog is open in it, and when its last turn started and ended. */
      main: { isWorking: boolean; isAsking: boolean; turnStartedAt?: number; turnEndedAt?: number }
      /** The task folders (`.flow/<slug>`, `.flow/reviews/<ts>`) this session's tool calls touched: the only tasks it shows. */
      tasks: string[]
      /** devflow's own version, from its plugin.json, so a stale install shows. */
      version: string | null
    }
  }
}
