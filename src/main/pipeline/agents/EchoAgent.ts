/**
 * EchoAgent -- a zero-dependency test agent.
 *
 * Splits the input prompt into words and yields each word as a token event
 * with a small delay, simulating an LLM streaming response. Requires no
 * API keys. Useful for verifying the pipeline end-to-end without any
 * external services.
 */

import type { Agent, AgentInput, AgentEvent } from '../AgentBase'

const DELAY_MS = 80

export class EchoAgent implements Agent {
  readonly name = 'echo'

  async *run(input: AgentInput, runId: string, signal: AbortSignal): AsyncGenerator<AgentEvent> {
    // Yield a thinking event first
    yield { type: 'thinking', data: { runId, text: 'Processing your input...' } }

    const words = input.prompt.split(/\s+/).filter(Boolean)

    for (let i = 0; i < words.length; i++) {
      // Respect cancellation
      if (signal.aborted) return

      await delay(DELAY_MS, signal)

      // Append a space before each word except the first
      const token = i === 0 ? words[i] : ' ' + words[i]
      yield { type: 'token', data: { runId, token } }
    }

    yield { type: 'done', data: { runId } }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Promise-based delay that rejects early if the signal is aborted.
 */
function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    const timer = setTimeout(resolve, ms)

    const onAbort = (): void => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }

    signal.addEventListener('abort', onAbort, { once: true })
  })
}
