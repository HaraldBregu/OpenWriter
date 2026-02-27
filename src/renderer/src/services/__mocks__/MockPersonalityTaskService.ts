import type {
  IPersonalityTaskService,
  PersonalitySubmitInput,
  PersonalitySubmitResult,
  PersonalitySaveOptions,
  PersonalitySaveResult,
} from '@/contexts/PersonalityTaskContext'
import type { EntityTaskIpcResult } from '@/services/IEntityTaskService'

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

  async submitTask(_input: PersonalitySubmitInput): Promise<EntityTaskIpcResult<PersonalitySubmitResult>> {
    const taskId = `mock-task-${++this.taskCounter}`
    return { success: true, data: { taskId } }
  }

  cancelTask(_taskId: string): void {
    // no-op in tests
  }

  async getModelSettings(_providerId: string): Promise<{ selectedModel?: string } | null> {
    return { selectedModel: 'gpt-4o-mini' }
  }

  async save(_options: PersonalitySaveOptions): Promise<PersonalitySaveResult> {
    return { id: `mock-saved-${Date.now()}` }
  }
}
