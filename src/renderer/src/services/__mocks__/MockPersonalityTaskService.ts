import type {
  IPersonalityTaskService,
  SavePersonalityOptions,
  SavePersonalityResult,
  SubmitTaskInput,
  SubmitTaskResult,
  SubmitTaskError,
} from '../IPersonalityTaskService'

/**
 * In-memory mock of IPersonalityTaskService for use in Jest tests and
 * Storybook stories. No Electron globals required.
 *
 * Usage:
 *   const mock = new MockPersonalityTaskService()
 *   render(<PersonalityTaskProvider service={mock}><MyComponent /></PersonalityTaskProvider>)
 */
export class MockPersonalityTaskService implements IPersonalityTaskService {
  private taskCounter = 0

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
}
