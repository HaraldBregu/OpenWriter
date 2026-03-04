/**
 * TextContinuation — inserts new content at a specific position within existing text.
 *
 * Unlike TextCompleter (which appends to the end), this agent receives the full
 * document split around a marked insertion point (<<INSERT_HERE>>) and generates
 * content that connects smoothly to both the preceding and following text.
 *
 * Runs as a single-node LangGraph StateGraph:
 *   START → generate_insertion → END
 *
 * The node splits the document at the marker, embeds both halves into a rich
 * system prompt with inline style-matching instructions, and streams only the
 * final insertion text — no JSON, no commentary.
 *
 * Expected prompt format (built by the caller):
 *   The prompt must contain the full document with <<INSERT_HERE>> at the
 *   insertion point, plus optional constraints (word count, topic, perspective).
 */

import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'
import type { BaseMessage } from '@langchain/core/messages'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { AgentDefinition } from './AgentDefinition'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INSERT_MARKER = '<<INSERT_HERE>>'

// ---------------------------------------------------------------------------
// Graph state
// ---------------------------------------------------------------------------

const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
  insertion: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
})

type TextContinuationState = typeof GraphState.State

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the raw user text from the LangGraph message list. */
function extractUserText(state: TextContinuationState): string {
  const userMsg = state.messages.find((m): m is HumanMessage => m._getType() === 'human')
  return userMsg ? String(userMsg.content) : ''
}

/** Split the user prompt around the <<INSERT_HERE>> marker. */
function splitAtMarker(text: string): { before: string; after: string } {
  const idx = text.indexOf(INSERT_MARKER)
  if (idx === -1) {
    return { before: text.trim(), after: '' }
  }
  return {
    before: text.slice(0, idx).trim(),
    after: text.slice(idx + INSERT_MARKER.length).trim(),
  }
}

// ---------------------------------------------------------------------------
// Node: generate_insertion
// Single node — splits the document, builds a self-contained prompt, and
// streams only the final insertion prose.
// ---------------------------------------------------------------------------

function makeGenerateInsertionNode(model: BaseChatModel) {
  return async (state: TextContinuationState): Promise<Partial<TextContinuationState>> => {
    const userText = extractUserText(state)
    const { before, after } = splitAtMarker(userText)

    const generationMessages = [
      new SystemMessage(
        `[CONTEXT BLOCK]
You are continuing a piece of writing. Your job is to insert new content at the marked position — not rewrite, not summarize, just continue naturally.

Before you write, silently analyze the surrounding text for:
- Vocabulary level, sentence length, and rhythm
- Tense, person, and voice (active/passive)
- Tone and register
- How the text before the marker ends and the text after begins
Then match all of these in your output.

[DOCUMENT BLOCK]
Here is the full document. The exact insertion point is marked with ${INSERT_MARKER}:

---
${before}

${INSERT_MARKER}

${after}
---

[TASK BLOCK]
Write the continuation that fits at ${INSERT_MARKER}.

Requirements:
- Match the tone, voice, and style of the surrounding text
- Connect smoothly to the sentence/paragraph before AND after the marker
- Do NOT repeat the existing text
- Do NOT add a title, heading, or commentary — output only the insertion text
- Do NOT wrap your response in quotes, markdown, or code fences
- If the marker falls mid-sentence, complete that sentence first before adding new content
- Produce coherent prose that reads as if it was always part of the document`
      ),
      new HumanMessage(
        'Generate the insertion text now. Output ONLY the prose to be placed at the insertion point — nothing else.'
      ),
    ]

    const response = await model.invoke(generationMessages)
    const insertion = typeof response.content === 'string' ? response.content : ''

    return {
      insertion,
      messages: [new AIMessage(insertion)],
    }
  }
}

// ---------------------------------------------------------------------------
// Graph factory
// ---------------------------------------------------------------------------

function buildTextContinuationGraph(model: BaseChatModel) {
  const graph = new StateGraph(GraphState)
    .addNode('generate_insertion', makeGenerateInsertionNode(model))
    .addEdge(START, 'generate_insertion')
    .addEdge('generate_insertion', END)

  return graph.compile()
}

// ---------------------------------------------------------------------------
// System prompt (used as fallback by AgentExecutor plain-chat path)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `[CONTEXT BLOCK]
You are continuing a piece of writing. Your job is to insert new content at the marked position — not rewrite, not summarize, just continue naturally.

[TASK BLOCK]
Write the continuation that fits at <<INSERT_HERE>>.

Requirements:
- Match the tone, voice, and style of the surrounding text
- Connect smoothly to the sentence/paragraph before AND after the marker
- Do NOT repeat the existing text
- Do NOT add a title, heading, or commentary — output only the insertion text
- Do NOT wrap your response in quotes, markdown, or code fences
- If the marker falls mid-sentence, complete that sentence first before adding new content
- Produce coherent prose that reads as if it was always part of the document`

// ---------------------------------------------------------------------------
// Agent definition
// ---------------------------------------------------------------------------

const definition: AgentDefinition = {
  id: 'text-continuation',
  name: 'Text Continuation',
  description:
    'Inserts new content at a specific position within existing text, matching the surrounding tone, voice, and style while connecting smoothly to both the preceding and following context.',
  category: 'writing',
  defaultConfig: {
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.4,
    maxHistoryMessages: 4,
  },
  inputHints: {
    label: 'Document with insertion point',
    placeholder:
      'Paste your full text with <<INSERT_HERE>> at the insertion point, followed by any constraints (word count, topic, perspective)…',
    multiline: true,
  },
  buildGraph: buildTextContinuationGraph,
}

export { definition as TextContinuationAgent }
