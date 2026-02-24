/**
 * Tests for AgentBase type contracts.
 *
 * AgentBase is pure types/interfaces — there is no runtime code to execute.
 * These tests verify the structural contracts by implementing the interfaces
 * in minimal concrete classes and asserting expected shape and behaviour.
 * This guarantees the interfaces remain coherent as the codebase evolves.
 */
import type {
  Agent,
  AgentInput,
  AgentEvent,
  TokenEvent,
  ThinkingEvent,
  DoneEvent,
  ErrorEvent
} from '../../../../../src/main/pipeline/AgentBase'

// ---------------------------------------------------------------------------
// Concrete implementations used only in these tests
// ---------------------------------------------------------------------------

class MinimalAgent implements Agent {
  readonly name = 'minimal'

  async *run(
    input: AgentInput,
    runId: string,
    _signal: AbortSignal
  ): AsyncGenerator<AgentEvent> {
    yield { type: 'thinking', data: { runId, text: `Received: ${input.prompt}` } }
    yield { type: 'done', data: { runId } }
  }
}

class AllEventTypesAgent implements Agent {
  readonly name = 'all-events'

  async *run(
    _input: AgentInput,
    runId: string,
    _signal: AbortSignal
  ): AsyncGenerator<AgentEvent> {
    const thinking: ThinkingEvent = { type: 'thinking', data: { runId, text: 'thinking...' } }
    const token: TokenEvent = { type: 'token', data: { runId, token: 'hello' } }
    const done: DoneEvent = { type: 'done', data: { runId } }
    const error: ErrorEvent = { type: 'error', data: { runId, message: 'oops' } }

    yield thinking
    yield token
    yield done
    yield error
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AgentBase — Agent interface', () => {
  describe('name property', () => {
    it('should be a readonly string on every implementation', () => {
      const agent = new MinimalAgent()
      expect(typeof agent.name).toBe('string')
      expect(agent.name).toBe('minimal')
    })

    it('should not change after construction (readonly)', () => {
      const agent = new MinimalAgent()
      const originalName = agent.name
      // TypeScript prevents assignment at compile time; verify value is stable
      expect(agent.name).toBe(originalName)
    })
  })

  describe('run() method', () => {
    it('should return an AsyncGenerator', () => {
      const agent = new MinimalAgent()
      const controller = new AbortController()
      const gen = agent.run({ prompt: 'hi' }, 'run-1', controller.signal)
      expect(typeof gen[Symbol.asyncIterator]).toBe('function')
    })

    it('should pass the prompt through in AgentInput', async () => {
      const agent = new MinimalAgent()
      const controller = new AbortController()
      const events: AgentEvent[] = []

      for await (const event of agent.run({ prompt: 'hello world' }, 'run-1', controller.signal)) {
        events.push(event)
      }

      // Thinking event should contain the prompt text
      expect(events[0].type).toBe('thinking')
      const thinkingEvent = events[0] as ThinkingEvent
      expect(thinkingEvent.data.text).toContain('hello world')
    })

    it('should accept optional context in AgentInput without error', async () => {
      const agent = new MinimalAgent()
      const controller = new AbortController()
      const events: AgentEvent[] = []

      const input: AgentInput = {
        prompt: 'test',
        context: { key: 'value', nested: { deep: true } }
      }

      for await (const event of agent.run(input, 'run-ctx', controller.signal)) {
        events.push(event)
      }

      expect(events.length).toBeGreaterThan(0)
    })

    it('should embed the provided runId in every emitted event', async () => {
      const agent = new MinimalAgent()
      const controller = new AbortController()
      const runId = 'unique-run-id-42'
      const events: AgentEvent[] = []

      for await (const event of agent.run({ prompt: 'test' }, runId, controller.signal)) {
        events.push(event)
      }

      events.forEach((event) => {
        expect(event.data.runId).toBe(runId)
      })
    })
  })
})

describe('AgentBase — AgentEvent discriminated union', () => {
  it('should produce all four event types from AllEventTypesAgent', async () => {
    const agent = new AllEventTypesAgent()
    const controller = new AbortController()
    const events: AgentEvent[] = []

    for await (const event of agent.run({ prompt: '' }, 'run-1', controller.signal)) {
      events.push(event)
    }

    const types = events.map((e) => e.type)
    expect(types).toContain('thinking')
    expect(types).toContain('token')
    expect(types).toContain('done')
    expect(types).toContain('error')
  })

  it('should carry text in ThinkingEvent', () => {
    const event: ThinkingEvent = { type: 'thinking', data: { runId: 'r1', text: 'working...' } }
    expect(event.type).toBe('thinking')
    expect(event.data.text).toBe('working...')
    expect(event.data.runId).toBe('r1')
  })

  it('should carry token string in TokenEvent', () => {
    const event: TokenEvent = { type: 'token', data: { runId: 'r1', token: 'abc' } }
    expect(event.type).toBe('token')
    expect(event.data.token).toBe('abc')
    expect(event.data.runId).toBe('r1')
  })

  it('should carry only runId in DoneEvent', () => {
    const event: DoneEvent = { type: 'done', data: { runId: 'r1' } }
    expect(event.type).toBe('done')
    expect(event.data.runId).toBe('r1')
    // DoneEvent has no extra fields beyond runId
    expect(Object.keys(event.data)).toEqual(['runId'])
  })

  it('should carry message string in ErrorEvent', () => {
    const event: ErrorEvent = {
      type: 'error',
      data: { runId: 'r1', message: 'something went wrong' }
    }
    expect(event.type).toBe('error')
    expect(event.data.message).toBe('something went wrong')
    expect(event.data.runId).toBe('r1')
  })
})

describe('AgentBase — AgentInput', () => {
  it('should accept input with only a prompt', () => {
    const input: AgentInput = { prompt: 'hello' }
    expect(input.prompt).toBe('hello')
    expect(input.context).toBeUndefined()
  })

  it('should accept input with a prompt and context', () => {
    const input: AgentInput = {
      prompt: 'hello',
      context: { providerId: 'openai', modelId: 'gpt-4o' }
    }
    expect(input.prompt).toBe('hello')
    expect(input.context?.providerId).toBe('openai')
    expect(input.context?.modelId).toBe('gpt-4o')
  })

  it('should accept an empty prompt string', () => {
    const input: AgentInput = { prompt: '' }
    expect(input.prompt).toBe('')
  })
})
