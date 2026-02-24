/**
 * Tests for TaskIpc.
 *
 * Strategy:
 *   - Verify module name, handler count (3), and channel names.
 *   - TaskIpc uses wrapSimpleHandler (no event param), so handlers receive
 *     only the payload arguments after the hidden event parameter.
 *   - Test task:submit, task:cancel, and task:list using a mock
 *     TaskExecutorService stored in the global container (not window-scoped).
 *   - Verify that task:list strips non-serializable fields and returns
 *     the trimmed TaskInfo shape.
 */
import { ipcMain } from 'electron'
import { TaskIpc } from '../../../../src/main/ipc/TaskIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_EVENT = {} as Electron.IpcMainInvokeEvent

function getHandler(channel: string) {
  const entry = (ipcMain.handle as jest.Mock).mock.calls.find((c: unknown[]) => c[0] === channel)
  if (!entry) throw new Error(`Handler for channel "${channel}" not registered`)
  return entry[1] as (...args: unknown[]) => Promise<unknown>
}

// ---------------------------------------------------------------------------
// Sample active task (contains non-serializable fields)
// ---------------------------------------------------------------------------

const ACTIVE_TASK = {
  taskId: 'task-abc-123',
  type: 'ai:inference',
  status: 'running',
  priority: 'normal',
  startedAt: 1705320000000,
  completedAt: undefined,
  windowId: 1,
  error: undefined,
  // Non-serializable fields that should be stripped by task:list
  abortController: { abort: jest.fn() },
  timeoutHandle: setTimeout(() => {}, 99999),
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('TaskIpc', () => {
  const EXPECTED_CHANNELS = ['task:submit', 'task:cancel', 'task:list']

  let module: TaskIpc
  let container: ServiceContainer
  let eventBus: EventBus
  let mockExecutor: Record<string, jest.Mock>

  beforeEach(() => {
    jest.clearAllMocks()

    mockExecutor = {
      submit: jest.fn().mockResolvedValue('task-abc-123'),
      cancel: jest.fn().mockReturnValue(true),
      listTasks: jest.fn().mockReturnValue([ACTIVE_TASK]),
    }

    container = new ServiceContainer()
    container.register('taskExecutor', mockExecutor)

    eventBus = new EventBus()
    module = new TaskIpc()
    module.register(container, eventBus)
  })

  afterEach(() => {
    // Clean up the dangling timeout from ACTIVE_TASK
    clearTimeout(ACTIVE_TASK.timeoutHandle)
  })

  // -------------------------------------------------------------------------
  // Module metadata
  // -------------------------------------------------------------------------

  it('should have name "task"', () => {
    expect(module.name).toBe('task')
  })

  it(`should register ${EXPECTED_CHANNELS.length} ipcMain handlers`, () => {
    expect((ipcMain.handle as jest.Mock).mock.calls).toHaveLength(EXPECTED_CHANNELS.length)
  })

  it('should register all expected channels', () => {
    const channels = (ipcMain.handle as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    for (const ch of EXPECTED_CHANNELS) {
      expect(channels).toContain(ch)
    }
  })

  // -------------------------------------------------------------------------
  // task:submit
  // -------------------------------------------------------------------------

  describe('task:submit handler', () => {
    it('should submit a task and return a taskId', async () => {
      const handler = getHandler('task:submit')
      const payload = { type: 'ai:inference', input: { prompt: 'Hello' }, options: { priority: 'high' } }

      const result = await handler(MOCK_EVENT, payload) as { success: boolean; data: { taskId: string } }
      expect(result.success).toBe(true)
      expect(result.data.taskId).toBe('task-abc-123')
      expect(mockExecutor.submit).toHaveBeenCalledWith(
        payload.type,
        payload.input,
        payload.options
      )
    })

    it('should submit without options when options is omitted', async () => {
      const handler = getHandler('task:submit')
      const payload = { type: 'ai:inference', input: { prompt: 'Hi' } }

      const result = await handler(MOCK_EVENT, payload) as { success: boolean; data: { taskId: string } }
      expect(result.success).toBe(true)
      expect(mockExecutor.submit).toHaveBeenCalledWith('ai:inference', payload.input, undefined)
    })

    it('should return error response when executor.submit throws', async () => {
      mockExecutor.submit.mockRejectedValueOnce(new Error('Executor failure'))
      const handler = getHandler('task:submit')

      const result = await handler(MOCK_EVENT, { type: 'bad', input: {} }) as { success: boolean }
      expect(result.success).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // task:cancel
  // -------------------------------------------------------------------------

  describe('task:cancel handler', () => {
    it('should return true when the task is successfully cancelled', async () => {
      const handler = getHandler('task:cancel')

      const result = await handler(MOCK_EVENT, 'task-abc-123') as { success: boolean; data: boolean }
      expect(result.success).toBe(true)
      expect(result.data).toBe(true)
      expect(mockExecutor.cancel).toHaveBeenCalledWith('task-abc-123')
    })

    it('should return false when the task is not found', async () => {
      mockExecutor.cancel.mockReturnValueOnce(false)
      const handler = getHandler('task:cancel')

      const result = await handler(MOCK_EVENT, 'nonexistent-task') as { success: boolean; data: boolean }
      expect(result.success).toBe(true)
      expect(result.data).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // task:list
  // -------------------------------------------------------------------------

  describe('task:list handler', () => {
    it('should return a list of active tasks', async () => {
      const handler = getHandler('task:list')

      const result = await handler(MOCK_EVENT) as { success: boolean; data: unknown[] }
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
    })

    it('should return only serializable TaskInfo fields', async () => {
      const handler = getHandler('task:list')

      const result = await handler(MOCK_EVENT) as { success: boolean; data: Array<Record<string, unknown>> }
      const taskInfo = result.data[0]

      // Should include serializable fields
      expect(taskInfo.taskId).toBe('task-abc-123')
      expect(taskInfo.type).toBe('ai:inference')
      expect(taskInfo.status).toBe('running')
      expect(taskInfo.priority).toBe('normal')
      expect(taskInfo.startedAt).toBe(1705320000000)
      expect(taskInfo.windowId).toBe(1)

      // Should NOT include non-serializable fields
      expect(taskInfo).not.toHaveProperty('abortController')
      expect(taskInfo).not.toHaveProperty('timeoutHandle')
    })

    it('should return an empty array when no tasks are active', async () => {
      mockExecutor.listTasks.mockReturnValueOnce([])
      const handler = getHandler('task:list')

      const result = await handler(MOCK_EVENT) as { success: boolean; data: unknown[] }
      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    it('should include completedAt and error when tasks have finished', async () => {
      const completedTask = {
        ...ACTIVE_TASK,
        taskId: 'task-done',
        status: 'completed',
        completedAt: 1705320005000,
        error: undefined,
      }
      mockExecutor.listTasks.mockReturnValueOnce([completedTask])

      const handler = getHandler('task:list')
      const result = await handler(MOCK_EVENT) as { success: boolean; data: Array<Record<string, unknown>> }
      expect(result.data[0].taskId).toBe('task-done')
      expect(result.data[0].completedAt).toBe(1705320005000)
    })

    it('should include error field for failed tasks', async () => {
      const failedTask = {
        ...ACTIVE_TASK,
        taskId: 'task-failed',
        status: 'failed',
        error: 'Timeout exceeded',
      }
      mockExecutor.listTasks.mockReturnValueOnce([failedTask])

      const handler = getHandler('task:list')
      const result = await handler(MOCK_EVENT) as { success: boolean; data: Array<Record<string, unknown>> }
      expect(result.data[0].error).toBe('Timeout exceeded')
    })
  })
})
