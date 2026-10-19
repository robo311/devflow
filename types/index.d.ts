export type FlowPart = { n: number; title: string; layer?: string; agent?: string; status: string }

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
  updatedAt?: string
  parts?: FlowPart[]
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

export type FlowView = { path: string; mtimeMs: number; state: FlowState }

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
    devflow: { flow: FlowView | null; agents: AgentRow[]; now: number; session: SessionInfo | null }
  }
}
