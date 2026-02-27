// ---------------------------------------------------------------------------
// IPersonalityTaskService
//
// Abstracts all Electron IPC calls required by PersonalityTaskContext so the
// context can be tested without a live Electron environment.
//
// DIP: PersonalityTaskContext depends on this interface, not on the concrete
// window.task / window.app / window.workspace globals.
// ---------------------------------------------------------------------------

export interface SavePersonalityOptions {
  sectionId: string
  content: string
  metadata: {
    title: string
    provider: string
    model: string
    temperature?: number
    maxTokens?: number | null
    reasoning?: boolean
  }
}

export interface SavePersonalityResult {
  id: string
}

export interface SubmitTaskInput {
  prompt: string
  providerId: string
  systemPrompt: string
  messages: { role: string; content: string }[]
  modelId?: string | null
  temperature?: number
  maxTokens?: number | null
}

export interface SubmitTaskResult {
  success: true
  data: { taskId: string }
}

export interface SubmitTaskError {
  success: false
  error: { message: string }
}

export type TaskEventType =
  | 'queued'
  | 'started'
  | 'progress'
  | 'completed'
  | 'error'
  | 'cancelled'
  | 'stream'

export interface TaskEvent {
  type: TaskEventType
  data: Record<string, unknown>
}

export interface IPersonalityTaskService {
  /**
   * Submit an AI chat task. Returns a result envelope.
   */
  submitTask(input: SubmitTaskInput): Promise<SubmitTaskResult | SubmitTaskError>

  /**
   * Cancel a running task by ID.
   */
  cancelTask(taskId: string): void

  /**
   * Retrieve the currently selected model name for a provider.
   * Returns null if unavailable.
   */
  getModelSettings(providerId: string): Promise<{ selectedModel?: string } | null>

  /**
   * Persist a personality section's conversation to disk.
   */
  savePersonality(options: SavePersonalityOptions): Promise<SavePersonalityResult>
}
