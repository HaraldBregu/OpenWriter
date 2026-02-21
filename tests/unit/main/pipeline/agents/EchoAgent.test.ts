/**
 * Tests for EchoAgent.
 * Validates word-by-word echo streaming, thinking events, cancellation, and delay behavior.
 */
import { EchoAgent } from '../../../../../src/main/pipeline/agents/EchoAgent'
import type { AgentEvent } from '../../../../../src/main/pipeline/AgentBase'

describe('EchoAgent', () => {
  let agent: EchoAgent

  beforeEach(() => {
    agent = new EchoAgent()
  })

  describe('properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('echo')
    })
  })

  describe('run', () => {
    it('should emit thinking event first', async () => {
      const events: AgentEvent[] = []
      const controller = new AbortController()

      const generator = agent.run(
        { prompt: 'test' },
        'run-1',
        controller.signal
      )

      for await (const event of generator) {
        events.push(event)
      }

      expect(events[0]).toEqual({
        type: 'thinking',
        data: {
          runId: 'run-1',
          text: 'Processing your input...'
        }
      })
    })

    it('should echo prompt word by word with spaces', async () => {
      const events: AgentEvent[] = []
      const controller = new AbortController()

      const generator = agent.run(
        { prompt: 'hello world test' },
        'run-1',
        controller.signal
      )

      for await (const event of generator) {
        events.push(event)
      }

      // Thinking + 3 tokens + done = 5 events
      expect(events).toHaveLength(5)

      expect(events[0].type).toBe('thinking')
      expect(events[1]).toEqual({
        type: 'token',
        data: { runId: 'run-1', token: 'hello' }
      })
      expect(events[2]).toEqual({
        type: 'token',
        data: { runId: 'run-1', token: ' world' }
      })
      expect(events[3]).toEqual({
        type: 'token',
        data: { runId: 'run-1', token: ' test' }
      })
      expect(events[4]).toEqual({
        type: 'done',
        data: { runId: 'run-1' }
      })
    })

    it('should emit done event when finished', async () => {
      const events: AgentEvent[] = []
      const controller = new AbortController()

      const generator = agent.run(
        { prompt: 'test' },
        'run-1',
        controller.signal
      )

      for await (const event of generator) {
        events.push(event)
      }

      const lastEvent = events[events.length - 1]
      expect(lastEvent).toEqual({
        type: 'done',
        data: { runId: 'run-1' }
      })
    })

    it('should handle single word prompt', async () => {
      const events: AgentEvent[] = []
      const controller = new AbortController()

      const generator = agent.run(
        { prompt: 'word' },
        'run-1',
        controller.signal
      )

      for await (const event of generator) {
        events.push(event)
      }

      expect(events).toHaveLength(3) // thinking + token + done
      expect(events[1]).toEqual({
        type: 'token',
        data: { runId: 'run-1', token: 'word' }
      })
    })

    it('should handle empty prompt', async () => {
      const events: AgentEvent[] = []
      const controller = new AbortController()

      const generator = agent.run(
        { prompt: '' },
        'run-1',
        controller.signal
      )

      for await (const event of generator) {
        events.push(event)
      }

      expect(events).toHaveLength(2) // thinking + done (no tokens)
      expect(events[0].type).toBe('thinking')
      expect(events[1].type).toBe('done')
    })

    it('should handle prompt with multiple spaces', async () => {
      const events: AgentEvent[] = []
      const controller = new AbortController()

      const generator = agent.run(
        { prompt: 'hello    world' },
        'run-1',
        controller.signal
      )

      for await (const event of generator) {
        events.push(event)
      }

      expect(events).toHaveLength(4) // thinking + 2 tokens + done
      expect(events[1].data).toEqual({ runId: 'run-1', token: 'hello' })
      expect(events[2].data).toEqual({ runId: 'run-1', token: ' world' })
    })

    it('should handle prompt with leading/trailing whitespace', async () => {
      const events: AgentEvent[] = []
      const controller = new AbortController()

      const generator = agent.run(
        { prompt: '  hello world  ' },
        'run-1',
        controller.signal
      )

      for await (const event of generator) {
        events.push(event)
      }

      expect(events).toHaveLength(4) // thinking + 2 tokens + done
    })

    it('should respect abort signal', async () => {
      const events: AgentEvent[] = []
      const controller = new AbortController()

      const generator = agent.run(
        { prompt: 'one two three four five' },
        'run-1',
        controller.signal
      )

      let eventCount = 0
      for await (const event of generator) {
        events.push(event)
        eventCount++

        // Abort after thinking + first token
        if (eventCount === 2) {
          controller.abort()
        }
      }

      // Should stop early (thinking + 1 token, no done)
      expect(events.length).toBeLessThan(7) // Would be 7 if completed (thinking + 5 tokens + done)
      expect(events[events.length - 1].type).not.toBe('done')
    })

    it('should not emit tokens or done if aborted during thinking', async () => {
      const events: AgentEvent[] = []
      const controller = new AbortController()

      // Abort immediately
      controller.abort()

      const generator = agent.run(
        { prompt: 'test' },
        'run-1',
        controller.signal
      )

      for await (const event of generator) {
        events.push(event)
      }

      // Might get thinking event before abort is checked
      expect(events.length).toBeLessThanOrEqual(1)
      if (events.length === 1) {
        expect(events[0].type).toBe('thinking')
      }
    })

    it('should use provided runId in all events', async () => {
      const events: AgentEvent[] = []
      const controller = new AbortController()

      const generator = agent.run(
        { prompt: 'test' },
        'custom-run-id',
        controller.signal
      )

      for await (const event of generator) {
        events.push(event)
      }

      events.forEach((event) => {
        expect(event.data.runId).toBe('custom-run-id')
      })
    })

    it('should include delays between tokens', async () => {
      const controller = new AbortController()
      const startTime = Date.now()

      const generator = agent.run(
        { prompt: 'one two three' },
        'run-1',
        controller.signal
      )

      // Consume all events
      const events: AgentEvent[] = []
      for await (const event of generator) {
        events.push(event)
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should take at least 3 delays (3 words) * 80ms = 240ms
      // Being lenient with 200ms to account for system variance
      expect(duration).toBeGreaterThan(200)
    })

    it('should not include context in processing (context is optional)', async () => {
      const events: AgentEvent[] = []
      const controller = new AbortController()

      const generator = agent.run(
        {
          prompt: 'test',
          context: { key: 'value', number: 42 }
        },
        'run-1',
        controller.signal
      )

      for await (const event of generator) {
        events.push(event)
      }

      // Context doesn't affect echo behavior
      expect(events).toHaveLength(3) // thinking + token + done
    })
  })
})
