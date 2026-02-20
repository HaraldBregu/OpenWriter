/**
 * Tests for CronIpc.
 * Verifies cron IPC handlers, job result broadcasting, and initialization.
 */
import { ipcMain } from 'electron'
import { CronIpc } from '../../../../src/main/ipc/CronIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

describe('CronIpc', () => {
  let module: CronIpc
  let container: ServiceContainer
  let eventBus: EventBus
  let mockCron: Record<string, jest.Mock>

  beforeEach(() => {
    jest.clearAllMocks()

    mockCron = {
      getAllJobs: jest.fn().mockReturnValue([]),
      getJob: jest.fn().mockReturnValue(null),
      startJob: jest.fn().mockReturnValue(true),
      stopJob: jest.fn().mockReturnValue(true),
      deleteJob: jest.fn().mockReturnValue(true),
      createJob: jest.fn().mockReturnValue(true),
      updateJobSchedule: jest.fn().mockReturnValue(true),
      validateCronExpression: jest.fn().mockReturnValue({ valid: true }),
      onJobResult: jest.fn().mockReturnValue(() => {}),
      initialize: jest.fn()
    }

    container = new ServiceContainer()
    container.register('cron', mockCron)
    eventBus = new EventBus()
    module = new CronIpc()
  })

  it('should have name "cron"', () => {
    expect(module.name).toBe('cron')
  })

  it('should register 8 ipcMain handlers', () => {
    module.register(container, eventBus)
    expect((ipcMain.handle as jest.Mock).mock.calls).toHaveLength(8)
  })

  it('should register all cron channels', () => {
    module.register(container, eventBus)
    const channels = (ipcMain.handle as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    expect(channels).toContain('cron-get-all-jobs')
    expect(channels).toContain('cron-get-job')
    expect(channels).toContain('cron-start-job')
    expect(channels).toContain('cron-stop-job')
    expect(channels).toContain('cron-delete-job')
    expect(channels).toContain('cron-create-job')
    expect(channels).toContain('cron-update-schedule')
    expect(channels).toContain('cron-validate-expression')
  })

  it('should call cron.initialize() during registration', () => {
    module.register(container, eventBus)
    expect(mockCron.initialize).toHaveBeenCalled()
  })

  it('should broadcast job results via EventBus', () => {
    const broadcastSpy = jest.spyOn(eventBus, 'broadcast')
    module.register(container, eventBus)

    expect(mockCron.onJobResult).toHaveBeenCalled()
    const callback = mockCron.onJobResult.mock.calls[0][0]
    callback({ id: 'j1', timestamp: new Date(), success: true, message: 'ok' })

    expect(broadcastSpy).toHaveBeenCalledWith('cron-job-result', expect.objectContaining({
      id: 'j1',
      success: true
    }))
  })
})
