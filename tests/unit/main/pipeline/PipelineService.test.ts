/**
 * Tests for PipelineService.
 * Validates agent run orchestration, event forwarding, cancellation, and error handling.
 */
import { PipelineService } from '../../../../src/main/pipeline/PipelineService'
import { AgentRegistry } from '../../../../src/main/pipeline/AgentRegistry'
import type { Agent, AgentInput, AgentEvent } from '../../../../src/main/pipeline/AgentBase'
import type { EventBus } from '../../../../src/main/core/EventBus'

// Mock agent that yields events
class MockAgent implements Agent {
  readonly name: string
  private events: AgentEvent[]

  constructor(name: string, events: AgentEvent[] = []) {
    this.name = name
    this.events = events
  }

  async *run(
    _input: AgentInput,
    runId: string,
    signal: AbortSignal
  ): AsyncGenerator<AgentEvent> {
    for (const event of this.events) {
      if (signal.aborted) break
      // Add runId to event data
      yield { ...event, data: { ...event.data, runId } } as AgentEvent
    }
  }
}

// Mock agent that delays before yielding
class DelayedAgent implements Agent {
  readonly name = 'delayed'

  async *run(
    _input: AgentInput,
    runId: string,
    signal: AbortSignal
  ): AsyncGenerator<AgentEvent> {
    yield { type: 'thinking', data: { runId, text: 'Starting...' } }

    // Wait for signal to be aborted or timeout
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 5000)
      signal.addEventListener('abort', () => {
        clearTimeout(timer)
        resolve()
      })
    })

    if (!signal.aborted) {
      yield { type: 'done', data: { runId } }
    }
  }
}

// Mock agent that throws an error
class ErrorAgent implements Agent {
  readonly name = 'error'

  // eslint-disable-next-line require-yield
  async *run(_input: AgentInput, _runId: string, _signal: AbortSignal): AsyncGenerator<AgentEvent> {
    throw new Error('Test error')
  }
}

describe('PipelineService', () => {
  let service: PipelineService
  let registry: AgentRegistry
  let mockEventBus: jest.Mocked<EventBus>
  let consoleLogSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    registry = new AgentRegistry()
    mockEventBus = {
      broadcast: jest.fn(),
      sendTo: jest.fn()
    } as unknown as jest.Mocked<EventBus>

    service = new PipelineService(registry, mockEventBus)

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    service.destroy()
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('start', () => {
    it('should throw when agent is not registered', async () => {
      await expect(
        service.start('nonexistent', { prompt: 'test' })
      ).rejects.toThrow('[PipelineService] Unknown agent "nonexistent"')
    })

    it('should list available agents in error message when agent not found', async () => {
      registry.register(new MockAgent('agent1', []))
      registry.register(new MockAgent('agent2', []))

      await expect(
        service.start('nonexistent', { prompt: 'test' })
      ).rejects.toThrow('Available: agent1, agent2')
    })

    it('should return a valid runId immediately', async () => {
      const agent = new MockAgent('test', [
        { type: 'token', data: { runId: '', token: 'test' } },
        { type: 'done', data: { runId: '' } }
      ])
      registry.register(agent)

      const runId = await service.start('test', { prompt: 'test' })

      expect(runId).toBeTruthy()
      expect(typeof runId).toBe('string')
      expect(runId.length).toBeGreaterThan(0)
    })

    it('should track active runs', async () => {
      const agent = new DelayedAgent()
      registry.register(agent)

      const runId = await service.start('delayed', { prompt: 'test' })

      expect(service.isRunning(runId)).toBe(true)

      // Clean up
      service.cancel(runId)
    })

    it('should forward events via EventBus broadcast by default', async () => {
      const agent = new MockAgent('test', [
        { type: 'token', data: { runId: '', token: 'hello' } },
        { type: 'token', data: { runId: '', token: ' world' } },
        { type: 'done', data: { runId: '' } }
      ])
      registry.register(agent)

      await service.start('test', { prompt: 'test' })

      // Wait for events to be processed
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockEventBus.broadcast).toHaveBeenCalledWith(
        'pipeline:event',
        expect.objectContaining({ type: 'token' })
      )
      expect(mockEventBus.sendTo).not.toHaveBeenCalled()
    })

    it('should forward events to specific window when windowId provided', async () => {
      const agent = new MockAgent('test', [
        { type: 'token', data: { runId: '', token: 'test' } },
        { type: 'done', data: { runId: '' } }
      ])
      registry.register(agent)

      await service.start('test', { prompt: 'test' }, 123)

      // Wait for events to be processed
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockEventBus.sendTo).toHaveBeenCalledWith(
        123,
        'pipeline:event',
        expect.objectContaining({ type: 'token' })
      )
      expect(mockEventBus.broadcast).not.toHaveBeenCalled()
    })

    it('should handle agent errors gracefully', async () => {
      const agent = new ErrorAgent()
      registry.register(agent)

      const runId = await service.start('error', { prompt: 'test' })

      // Wait for error to be processed
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockEventBus.broadcast).toHaveBeenCalledWith(
        'pipeline:event',
        expect.objectContaining({
          type: 'error',
          data: expect.objectContaining({
            runId,
            message: 'Test error'
          })
        })
      )

      // Run should be cleaned up after error
      expect(service.isRunning(runId)).toBe(false)
    })

    it('should pass input to agent', async () => {
      let capturedInput: AgentInput | null = null

      class CaptureAgent implements Agent {
        readonly name = 'capture'

        async *run(
          input: AgentInput,
          runId: string,
          _signal: AbortSignal
        ): AsyncGenerator<AgentEvent> {
          capturedInput = input
          yield { type: 'done', data: { runId } }
        }
      }

      const agent = new CaptureAgent()
      registry.register(agent)

      await service.start('capture', {
        prompt: 'test prompt',
        context: { key: 'value' }
      })

      // Wait for agent to run
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(capturedInput).toEqual({
        prompt: 'test prompt',
        context: { key: 'value' }
      })
    })
  })

  describe('cancel', () => {
    it('should cancel an active run', async () => {
      const agent = new DelayedAgent()
      registry.register(agent)

      const runId = await service.start('delayed', { prompt: 'test' })

      expect(service.isRunning(runId)).toBe(true)

      const result = service.cancel(runId)

      expect(result).toBe(true)
      expect(service.isRunning(runId)).toBe(false)
    })

    it('should return false when cancelling non-existent run', () => {
      const result = service.cancel('nonexistent')

      expect(result).toBe(false)
    })

    it('should log cancellation', () => {
      const agent = new DelayedAgent()
      registry.register(agent)

      service.start('delayed', { prompt: 'test' }).then((runId) => {
        service.cancel(runId)

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(`Cancelling run ${runId}`)
        )
      })
    })
  })

  describe('isRunning', () => {
    it('should return false for non-existent run', () => {
      expect(service.isRunning('nonexistent')).toBe(false)
    })

    it('should return true for active run', async () => {
      const agent = new DelayedAgent()
      registry.register(agent)

      const runId = await service.start('delayed', { prompt: 'test' })

      expect(service.isRunning(runId)).toBe(true)

      service.cancel(runId)
    })

    it('should return false after run completes', async () => {
      const agent = new MockAgent('test', [
        { type: 'done', data: { runId: '' } }
      ])
      registry.register(agent)

      const runId = await service.start('test', { prompt: 'test' })

      // Wait for run to complete
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(service.isRunning(runId)).toBe(false)
    })
  })

  describe('listActiveRuns', () => {
    it('should return empty array when no runs are active', () => {
      expect(service.listActiveRuns()).toEqual([])
    })

    it('should list all active runs with metadata', async () => {
      const agent = new DelayedAgent()
      registry.register(agent)

      const runId1 = await service.start('delayed', { prompt: 'first' })
      const runId2 = await service.start('delayed', { prompt: 'second' })

      const activeRuns = service.listActiveRuns()

      expect(activeRuns).toHaveLength(2)
      expect(activeRuns[0]).toEqual({
        runId: runId1,
        agentName: 'delayed',
        startedAt: expect.any(Number)
      })
      expect(activeRuns[1]).toEqual({
        runId: runId2,
        agentName: 'delayed',
        startedAt: expect.any(Number)
      })

      service.cancel(runId1)
      service.cancel(runId2)
    })
  })

  describe('listAgents', () => {
    it('should return empty array when no agents registered', () => {
      expect(service.listAgents()).toEqual([])
    })

    it('should list all registered agents', () => {
      registry.register(new MockAgent('agent1', []))
      registry.register(new MockAgent('agent2', []))
      registry.register(new MockAgent('agent3', []))

      const agents = service.listAgents()

      expect(agents).toHaveLength(3)
      expect(agents).toContain('agent1')
      expect(agents).toContain('agent2')
      expect(agents).toContain('agent3')
    })
  })

  describe('destroy', () => {
    it('should abort all active runs', async () => {
      const agent = new DelayedAgent()
      registry.register(agent)

      const runId1 = await service.start('delayed', { prompt: 'first' })
      const runId2 = await service.start('delayed', { prompt: 'second' })

      expect(service.isRunning(runId1)).toBe(true)
      expect(service.isRunning(runId2)).toBe(true)

      service.destroy()

      expect(service.isRunning(runId1)).toBe(false)
      expect(service.isRunning(runId2)).toBe(false)
    })

    it('should clear all runs', async () => {
      const agent = new DelayedAgent()
      registry.register(agent)

      await service.start('delayed', { prompt: 'test' })

      expect(service.listActiveRuns()).toHaveLength(1)

      service.destroy()

      expect(service.listActiveRuns()).toHaveLength(0)
    })

    it('should log destruction with active run count', async () => {
      const agent = new DelayedAgent()
      registry.register(agent)

      await service.start('delayed', { prompt: 'first' })
      await service.start('delayed', { prompt: 'second' })

      service.destroy()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Destroying, aborting 2 active run(s)')
      )
    })
  })

  describe('concurrent runs', () => {
    it('should handle multiple concurrent runs', async () => {
      const agent = new MockAgent('test', [
        { type: 'token', data: { runId: '', token: 'test' } },
        { type: 'done', data: { runId: '' } }
      ])
      registry.register(agent)

      const runId1 = await service.start('test', { prompt: 'first' })
      const runId2 = await service.start('test', { prompt: 'second' })
      const runId3 = await service.start('test', { prompt: 'third' })

      expect(runId1).not.toBe(runId2)
      expect(runId2).not.toBe(runId3)

      // Wait for runs to complete
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(service.isRunning(runId1)).toBe(false)
      expect(service.isRunning(runId2)).toBe(false)
      expect(service.isRunning(runId3)).toBe(false)
    })
  })
})
