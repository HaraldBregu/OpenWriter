export interface AgentTokenEvent {
  runId: string
  token: string
}

export interface AgentThinkingEvent {
  runId: string
  thinking: string
}

export interface AgentToolStartEvent {
  runId: string
  tool: string
  input: unknown
}

export interface AgentToolEndEvent {
  runId: string
  tool: string
  output: unknown
}

export interface AgentDoneEvent {
  runId: string
  cancelled?: boolean
}

export interface AgentErrorEvent {
  runId: string
  error: string
}

export type AgentEventType =
  | 'agent:token'
  | 'agent:thinking'
  | 'agent:tool_start'
  | 'agent:tool_end'
  | 'agent:done'
  | 'agent:error'

export const AGENT_CHANNELS: AgentEventType[] = [
  'agent:token',
  'agent:thinking',
  'agent:tool_start',
  'agent:tool_end',
  'agent:done',
  'agent:error'
]
