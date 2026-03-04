/**
 * SentenceCompleter — completes an unfinished sentence at the cursor position.
 *
 * Receives the document split into three parts:
 *   1. Text BEFORE the current sentence start
 *   2. The incomplete sentence fragment (partial)
 *   3. Text AFTER the cursor position
 *
 * The caller marks the cursor with █ inside the prompt. The agent outputs
 * only the raw completion text — no preamble, no explanation.
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
// Constants
// ---------------------------------------------------------------------------

const CURSOR_MARKER = '█'

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

/**
 * Split the document around the cursor marker into:
 *   - contextBefore: everything before the start of the current sentence
 *   - partial: the incomplete sentence fragment up to the cursor
 *   - contextAfter: everything after the cursor
 */
function splitAtCursor(text: string): {
  contextBefore: string
  partial: string
  contextAfter: string
} {
  const idx = text.indexOf(CURSOR_MARKER)
  if (idx === -1) {
    // No cursor — treat the whole text as context before with empty partial
    return { contextBefore: text.trim(), partial: '', contextAfter: '' }
  }

  const before = text.slice(0, idx)
  const after = text.slice(idx + CURSOR_MARKER.length).trim()

  // Find the start of the current (incomplete) sentence by looking backwards
  // for the last sentence-ending punctuation followed by whitespace.
  const sentenceBoundary = before.search(/[.!?]\s+(?=[A-Z\u00C0-\u024F"])[^.!?]*$/m)

  let contextBefore: string
  let partial: string

  if (sentenceBoundary === -1) {
    // No sentence boundary found — the entire "before" is the partial
    contextBefore = ''
    partial = before.trimStart()
  } else {
    // Include the punctuation + space in contextBefore, partial starts after
    const splitPoint = before.indexOf(' ', sentenceBoundary + 1) + 1
    contextBefore = before.slice(0, splitPoint).trim()
    partial = before.slice(splitPoint).trimStart()
  }

  return { contextBefore, partial, contextAfter: after }
}

// ---------------------------------------------------------------------------
// Node: complete_sentence
// ---------------------------------------------------------------------------

function makeCompleteSentenceNode(model: BaseChatModel) {
  return async (state: SentenceCompleterState): Promise<Partial<SentenceCompleterState>> => {
    const userText = extractUserText(state)
    const { contextBefore, partial, contextAfter } = splitAtCursor(userText)

    const generationMessages = [
      new SystemMessage(
        `You are a sentence completion engine. Your only job is to complete the unfinished sentence at the cursor position.

[DOCUMENT CONTEXT — text BEFORE the cursor]
${contextBefore || '(document start)'}

[INCOMPLETE SENTENCE — what the user is currently writing]
${partial}${CURSOR_MARKER}

[DOCUMENT CONTEXT — text AFTER the cursor]
${contextAfter || '(document end)'}

[TASK]
Complete the incomplete sentence fragment above (after the ${CURSOR_MARKER} cursor).

Rules:
1. Output ONLY the completion — no preamble, no explanation, no punctuation recap
2. The completion must flow seamlessly from: "${partial}"
3. End with a single period, question mark, or exclamation mark unless the sentence clearly continues into the next paragraph
4. Match the tone, formality, and vocabulary of the surrounding text
5. Keep it concise — complete the thought, don't expand into new ideas
6. If the partial is empty, write one full sentence that fits naturally between the before and after context

Output format: raw completion text only.`
      ),
      new HumanMessage(
        'Complete the sentence now. Output ONLY the raw completion text — nothing else.'
      ),
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

const SYSTEM_PROMPT = `You are a sentence completion engine. Your only job is to complete the unfinished sentence at the cursor position.

Rules:
1. Output ONLY the completion — no preamble, no explanation, no punctuation recap
2. The completion must flow seamlessly from the partial sentence
3. End with a single period, question mark, or exclamation mark unless the sentence clearly continues into the next paragraph
4. Match the tone, formality, and vocabulary of the surrounding text
5. Keep it concise — complete the thought, don't expand into new ideas
6. If the partial is empty, write one full sentence that fits naturally between the before and after context

Output format: raw completion text only.`

// ---------------------------------------------------------------------------
// Agent definition
// ---------------------------------------------------------------------------

const definition: AgentDefinition = {
  id: 'sentence-completer',
  name: 'Sentence Completer',
  description:
    'Completes an unfinished sentence at the cursor position, matching the tone, formality, and vocabulary of the surrounding text.',
  category: 'writing',
  defaultConfig: {
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.3,
    maxHistoryMessages: 4,
  },
  inputHints: {
    label: 'Text with cursor',
    placeholder: 'Type your text and place █ where you want the sentence completed…',
    multiline: true,
  },
  buildGraph: buildSentenceCompleterGraph,
}

export { definition as SentenceCompleterAgent }
