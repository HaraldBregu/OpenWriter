/**
 * EnhanceAgent -- Single-shot writing improvement agent.
 *
 * Takes a block of text and returns an improved version with better clarity,
 * grammar, and flow while preserving the original meaning and approximate length.
 *
 * Uses the same OpenAI provider/model resolution as ChatAgent:
 *  - API key: StoreService (providerId context) -> VITE_OPENAI_API_KEY env var
 *  - Model: context.modelId -> StoreService selectedModel -> VITE_OPENAI_MODEL -> gpt-4o-mini
 *
 * No conversation history -- each run is a standalone enhancement request.
 */

import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type { Agent, AgentInput, AgentEvent } from '../AgentBase'
import type { StoreService } from '../../services/store'
import { isReasoningModel, extractTokenFromChunk, classifyError } from '../../shared/aiUtils'
import { ProviderResolver } from '../../shared/ProviderResolver'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOG_PREFIX = '[EnhanceAgent]'

const SYSTEM_PROMPT = `You are a precise writing editor. Your task is to improve the given text while following these rules strictly:

- Fix grammar, spelling, and punctuation errors
- Improve clarity and readability
- Smooth out awkward phrasing and improve flow
- Preserve the original meaning, tone, and intent exactly
- Keep the output roughly the same length as the input
- Do NOT add new information or ideas
- Do NOT remove important details
- Do NOT change the formatting structure (paragraphs, lists, etc.)
- Output ONLY the improved text — no explanations, no preamble, no commentary`

// ---------------------------------------------------------------------------
// Agent implementation
// ---------------------------------------------------------------------------

export class EnhanceAgent implements Agent {
  readonly name = 'enhance'

  constructor(private readonly storeService: StoreService) {}

  async *run(input: AgentInput, runId: string, signal: AbortSignal): AsyncGenerator<AgentEvent> {
    // --- Resolve configuration -----------------------------------------------

    const resolver = new ProviderResolver(this.storeService)
    let provider
    try {
      provider = resolver.resolve({
        providerId: input.context?.providerId as string | undefined,
        modelId: input.context?.modelId as string | undefined
      })
    } catch (err) {
      console.error(`${LOG_PREFIX} Run ${runId} - Provider resolution failed:`, err)
      yield {
        type: 'error',
        data: {
          runId,
          message: err instanceof Error ? err.message : 'Failed to resolve provider configuration'
        }
      }
      return
    }

    const { apiKey, modelName, providerId } = provider
    const temperature = 0.3

    console.log(
      `${LOG_PREFIX} Starting run ${runId} with provider=${providerId} model=${modelName} temperature=${temperature}`
    )

    yield { type: 'thinking', data: { runId, text: 'Enhancing text...' } }

    // --- Build the LangChain model -------------------------------------------

    const model = new ChatOpenAI({
      apiKey,
      model: modelName,
      streaming: true,
      ...(isReasoningModel(modelName) ? {} : { temperature })
    })

    // --- Build message chain (single-shot, no history) -----------------------

    const langchainMessages = [
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(input.prompt)
    ]

    // --- Stream tokens -------------------------------------------------------

    try {
      const stream = await model.stream(langchainMessages, { signal })

      for await (const chunk of stream) {
        if (signal.aborted) break

        const token = extractTokenFromChunk(chunk.content)
        if (token) {
          yield { type: 'token', data: { runId, token } }
        }
      }

      if (!signal.aborted) {
        console.log(`${LOG_PREFIX} Run ${runId} completed`)
        yield { type: 'done', data: { runId } }
      } else {
        console.log(`${LOG_PREFIX} Run ${runId} cancelled`)
      }
    } catch (error: unknown) {
      const kind = classifyError(error)

      if (kind === 'abort') {
        console.log(`${LOG_PREFIX} Run ${runId} aborted`)
        return
      }

      const rawMessage = error instanceof Error ? error.message : String(error)
      console.error(`${LOG_PREFIX} Run ${runId} error (${kind}):`, rawMessage)

      const userMessage =
        kind === 'auth'
          ? 'Authentication failed. Please check your API key in Settings.'
          : kind === 'rate_limit'
            ? 'Rate limit exceeded. Please wait a moment and try again.'
            : `OpenAI request failed: ${rawMessage}`

      yield { type: 'error', data: { runId, message: userMessage } }
    }
  }
}
