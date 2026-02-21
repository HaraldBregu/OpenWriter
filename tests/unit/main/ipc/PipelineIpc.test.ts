/**
 * Tests for PipelineIpc.
 * Verifies all pipeline IPC handler registrations and service delegation.
 */
import { ipcMain, BrowserWindow } from 'electron'
import { PipelineIpc } from '../../../../src/main/ipc/PipelineIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

describe('PipelineIpc', () => {
  let module: PipelineIpc
  let container: ServiceContainer
  let eventBus: EventBus
  let mockPipeline: Record<string, jest.Mock>

  beforeEach(() => {
    jest.clearAllMocks()

    mockPipeline = {
      start: jest.fn().mockResolvedValue('run-123'),
      cancel: jest.fn().mockReturnValue(true),
      isRunning: jest.fn().mockReturnValue(false),
      listActiveRuns: jest.fn().mockReturnValue([]),
      listAgents: jest.fn().mockReturnValue(['echo', 'counter']),
      destroy: jest.fn()
    }

    container = new ServiceContainer()
    container.register('pipeline', mockPipeline)
    eventBus = new EventBus()
    module = new PipelineIpc()
  })

  it('should have name "pipeline"', () => {
    expect(module.name).toBe('pipeline')
  })

  it('should register all pipeline handlers', () => {
    module.register(container, eventBus)

    const handleChannels = (ipcMain.handle as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    const onChannels = (ipcMain.on as jest.Mock).mock.calls.map((c: unknown[]) => c[0])

    expect(handleChannels).toContain('pipeline:run')
    expect(handleChannels).toContain('pipeline:list-agents')
    expect(handleChannels).toContain('pipeline:list-runs')
    expect(onChannels).toContain('pipeline:cancel')
  })

  describe('pipeline:run handler', () => {
    it('should delegate to pipeline.start and return runId', async () => {
      module.register(container, eventBus)

      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'pipeline:run'
      )[1]

      const mockEvent = {
        sender: {
          id: 1
        }
      }

      // Mock BrowserWindow.fromWebContents to return a mock window
      ;(BrowserWindow.fromWebContents as jest.Mock).mockReturnValue({
        id: 123,
        isDestroyed: () => false
      })

      const result = await handler(mockEvent, 'echo', { prompt: 'test input' })

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ runId: 'run-123' })
      expect(mockPipeline.start).toHaveBeenCalledWith(
        'echo',
        { prompt: 'test input' },
        123
      )
    })

    it('should handle window ID when window is destroyed', async () => {
      module.register(container, eventBus)

      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'pipeline:run'
      )[1]

      const mockEvent = {
        sender: {
          id: 1
        }
      }

      ;(BrowserWindow.fromWebContents as jest.Mock).mockReturnValue({
        id: 123,
        isDestroyed: () => true
      })

      await handler(mockEvent, 'echo', { prompt: 'test' })

      expect(mockPipeline.start).toHaveBeenCalledWith(
        'echo',
        { prompt: 'test' },
        undefined
      )
    })

    it('should handle missing window gracefully', async () => {
      module.register(container, eventBus)

      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'pipeline:run'
      )[1]

      const mockEvent = {
        sender: {
          id: 1
        }
      }

      ;(BrowserWindow.fromWebContents as jest.Mock).mockReturnValue(null)

      await handler(mockEvent, 'echo', { prompt: 'test' })

      expect(mockPipeline.start).toHaveBeenCalledWith(
        'echo',
        { prompt: 'test' },
        undefined
      )
    })

    it('should pass context to pipeline service', async () => {
      module.register(container, eventBus)

      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'pipeline:run'
      )[1]

      const mockEvent = {
        sender: {
          id: 1
        }
      }

      ;(BrowserWindow.fromWebContents as jest.Mock).mockReturnValue(null)

      await handler(mockEvent, 'counter', {
        prompt: 'count to 10',
        context: { providerId: 'openai' }
      })

      expect(mockPipeline.start).toHaveBeenCalledWith(
        'counter',
        {
          prompt: 'count to 10',
          context: { providerId: 'openai' }
        },
        undefined
      )
    })
  })

  describe('pipeline:cancel handler', () => {
    it('should delegate to pipeline.cancel', () => {
      module.register(container, eventBus)

      const handler = (ipcMain.on as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'pipeline:cancel'
      )[1]

      handler({}, 'run-123')

      expect(mockPipeline.cancel).toHaveBeenCalledWith('run-123')
    })
  })

  describe('pipeline:list-agents handler', () => {
    it('should delegate to pipeline.listAgents', async () => {
      module.register(container, eventBus)

      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'pipeline:list-agents'
      )[1]

      const result = await handler()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(['echo', 'counter'])
      expect(mockPipeline.listAgents).toHaveBeenCalled()
    })
  })

  describe('pipeline:list-runs handler', () => {
    it('should delegate to pipeline.listActiveRuns', async () => {
      mockPipeline.listActiveRuns.mockReturnValue([
        { runId: 'run-1', agentName: 'echo', startedAt: 123456789 },
        { runId: 'run-2', agentName: 'counter', startedAt: 123456790 }
      ])

      module.register(container, eventBus)

      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'pipeline:list-runs'
      )[1]

      const result = await handler()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toEqual({
        runId: 'run-1',
        agentName: 'echo',
        startedAt: 123456789
      })
      expect(mockPipeline.listActiveRuns).toHaveBeenCalled()
    })

    it('should return empty array when no runs are active', async () => {
      module.register(container, eventBus)

      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'pipeline:list-runs'
      )[1]

      const result = await handler()

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })
  })
})
