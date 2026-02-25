import type {
  IPersonalityTaskService,
  SavePersonalityOptions,
  SavePersonalityResult,
  SubmitTaskInput,
  SubmitTaskResult,
  SubmitTaskError,
  TaskEvent,
} from '../IPersonalityTaskService'

/**
 * In-memory mock of IPersonalityTaskService for use in Jest tests and
 * Storybook stories. No Electron globals required.
 *
 * Usage:
 *   const mock = new MockPersonalityTaskService()
 *   render(<PersonalityTaskProvider service={mock}><MyComponent /></PersonalityTaskProvider>)
 *   mock.simulateStream('consciousness', 'Hello world')
 *   mock.simulateComplete('consciousness')
 */
export class MockPersonalityTaskService implements IPersonalityTaskService {
  private handlers: Array<(event: TaskEvent) => void> = []
  private taskCounter = 0

  onTaskEvent(handler: (event: TaskEvent) => void): () => void {
    this.handlers.push(handler)
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler)
    }
  }

  async submitTask(_input: SubmitTaskInput): Promise<SubmitTaskResult | SubmitTaskError> {
    const taskId = `mock-task-${++this.taskCounter}`
    return { success: true, data: { taskId } }
  }

  cancelTask(_taskId: string): void {
    // no-op in tests
  }

  async getModelSettings(_providerId: string): Promise<{ selectedModel?: string } | null> {
    return { selectedModel: 'gpt-4o-mini' }
  }

  async savePersonality(_options: SavePersonalityOptions): Promise<SavePersonalityResult> {
    return { id: `mock-saved-${Date.now()}` }
  }

  // ---------------------------------------------------------------------------
  // Test helpers — simulate IPC events
  // ---------------------------------------------------------------------------

  /** Emit a stream token as if the AI sent it. */
  simulateStream(taskId: string, token: string): void {
    this.emit({ type: 'stream', data: { taskId, token } })
  }

  /** Emit a completed event with final content. */
  simulateComplete(taskId: string, content: string): void {
    this.emit({ type: 'completed', data: { taskId, result: { content, tokenCount: content.length } } })
  }

  /** Emit an error event. */
  simulateError(taskId: string, message: string): void {
    this.emit({ type: 'error', data: { taskId, message } })
  }

  /** Emit a cancelled event. */
  simulateCancelled(taskId: string): void {
    this.emit({ type: 'cancelled', data: { taskId } })
  }

  private emit(event: TaskEvent): void {
    this.handlers.forEach((h) => h(event))
  }
}
