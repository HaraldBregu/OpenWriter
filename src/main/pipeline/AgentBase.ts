/**
 * Base types and interface for pipeline agents.
 *
 * Every agent implements the Agent interface with a single async generator
 * method `run()`. This keeps agent logic isolated from IPC plumbing:
 * the agent yields events, and the pipeline service handles delivery.
 */

// ---------------------------------------------------------------------------
// Event types emitted by agents during a run
// ---------------------------------------------------------------------------

export interface TokenEvent {
  type: 'token'
  data: { runId: string; token: string }
}

export interface ThinkingEvent {
  type: 'thinking'
  data: { runId: string; text: string }
}

export interface DoneEvent {
  type: 'done'
  data: { runId: string }
}

export interface ErrorEvent {
  type: 'error'
  data: { runId: string; message: string }
}

export type AgentEvent = TokenEvent | ThinkingEvent | DoneEvent | ErrorEvent

// ---------------------------------------------------------------------------
// Input passed to every agent run
// ---------------------------------------------------------------------------

export interface AgentInput {
  /** The user prompt / question */
  prompt: string
  /** Optional arbitrary context the renderer can pass along */
  context?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Agent interface
// ---------------------------------------------------------------------------

export interface Agent {
  /** Unique name used to look up this agent at runtime */
  readonly name: string

  /**
   * Execute the agent. Yields streaming AgentEvents until completion.
   *
   * @param input  - The prompt and optional context
   * @param runId  - Unique identifier for this run (set by PipelineService)
   * @param signal - AbortSignal the agent must respect for cancellation
   */
  run(input: AgentInput, runId: string, signal: AbortSignal): AsyncGenerator<AgentEvent>
}
