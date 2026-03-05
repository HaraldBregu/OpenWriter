/**
 * SentenceCompleter — continues writing from the end of the given text.
 *
 * Receives plain text and outputs only the continuation — no preamble,
 * no explanation, no repeated input.
 *
 * Runs as a single-node LangGraph StateGraph:
 *   START → complete_sentence → END
 */

import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'
import type { BaseMessage } from '@langchain/core/messages'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { AgentDefinition } from './AgentDefinition'

// ---------------------------------------------------------------------------
// Graph state
// ---------------------------------------------------------------------------

const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
  completion: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
})

type SentenceCompleterState = typeof GraphState.State

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the raw user text from the LangGraph message list. */
function extractUserText(state: SentenceCompleterState): string {
  const userMsg = state.messages.find((m): m is HumanMessage => m._getType() === 'human')
  return userMsg ? String(userMsg.content) : ''
}

// ---------------------------------------------------------------------------
// Node: complete_sentence
// ---------------------------------------------------------------------------

function makeCompleteSentenceNode(model: BaseChatModel) {
  return async (state: SentenceCompleterState): Promise<Partial<SentenceCompleterState>> => {
    const text = extractUserText(state)

    const generationMessages = [
      new SystemMessage(
        `You are a sentence completion engine. Given an unfinished sentence, you finish it and stop.

Rules:
1. Output ONLY the few words needed to finish the current sentence — nothing more
2. Never repeat any part of the input
3. End with a period, question mark, or exclamation mark
4. Do NOT start a new sentence after finishing the current one
5. Match the tone, formality, and vocabulary of the given text
6. Be as brief as possible — just close the sentence
7. No preamble, no explanation, no meta-commentary`
      ),
      new HumanMessage(text),
    ]

    const response = await model.invoke(generationMessages)
    const completion = typeof response.content === 'string' ? response.content : ''

    return {
      completion,
      messages: [new AIMessage(completion)],
    }
  }
}

// ---------------------------------------------------------------------------
// Graph factory
// ---------------------------------------------------------------------------

function buildSentenceCompleterGraph(model: BaseChatModel) {
  const graph = new StateGraph(GraphState)
    .addNode('complete_sentence', makeCompleteSentenceNode(model))
    .addEdge(START, 'complete_sentence')
    .addEdge('complete_sentence', END)

  return graph.compile()
}

// ---------------------------------------------------------------------------
// System prompt (used as fallback by AgentExecutor plain-chat path)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a sentence completion engine. Given an unfinished sentence, you finish it and stop.

Rules:
1. Output ONLY the few words needed to finish the current sentence — nothing more
2. Never repeat any part of the input
3. End with a period, question mark, or exclamation mark
4. Do NOT start a new sentence after finishing the current one
5. Match the tone, formality, and vocabulary of the given text
6. Be as brief as possible — just close the sentence
7. No preamble, no explanation, no meta-commentary`

// ---------------------------------------------------------------------------
// Agent definition
// ---------------------------------------------------------------------------

const definition: AgentDefinition = {
  id: 'sentence-completer',
  name: 'Sentence Completer',
  description:
    'Finishes the current unfinished sentence and stops, matching the tone and style of the text.',
  category: 'writing',
  defaultConfig: {
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.3,
    maxHistoryMessages: 4,
  },
  inputHints: {
    label: 'Text to continue',
    placeholder: 'Type your text and the AI will continue writing from where you left off…',
    multiline: true,
  },
  buildGraph: buildSentenceCompleterGraph,
}

export { definition as SentenceCompleterAgent }
