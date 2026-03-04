/**
 * TextContinuation — inserts new content at a specific position within existing text.
 *
 * Unlike TextCompleter (which appends to the end), this agent receives the full
 * document split around a marked insertion point (<<INSERT_HERE>>) and generates
 * content that connects smoothly to both the preceding and following text.
 *
 * Runs as a two-node LangGraph StateGraph:
 *   START → analyze_context → generate_insertion → END
 *
 * The analyze_context node extracts style metadata and structural cues from the
 * surrounding text at low temperature.
 * The generate_insertion node uses those cues to produce a faithful insertion
 * that bridges the text before and after the marker.
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
  textBefore: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  textAfter: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  styleNotes: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
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
    // No marker — treat the entire text as "before" (append mode fallback)
    return { before: text.trim(), after: '' }
  }
  return {
    before: text.slice(0, idx).trim(),
    after: text.slice(idx + INSERT_MARKER.length).trim(),
  }
}

// ---------------------------------------------------------------------------
// Node: analyze_context
// Extracts style metadata from the surrounding text at low temperature.
// ---------------------------------------------------------------------------

function makeAnalyzeContextNode(model: BaseChatModel) {
  return async (state: TextContinuationState): Promise<Partial<TextContinuationState>> => {
    const userText = extractUserText(state)
    const { before, after } = splitAtMarker(userText)

    const analysisMessages = [
      new SystemMessage(
        `You are a literary style analyst. Given two text fragments (BEFORE and AFTER an insertion point), analyze the writing style so another model can generate matching content.

Return ONLY a valid JSON object with these exact keys:
{
  "vocabularyLevel": "simple | intermediate | advanced | technical",
  "avgSentenceLength": "short | medium | long | mixed",
  "tense": "past | present | future | mixed",
  "person": "first | second | third",
  "tone": "brief description of tone",
  "voice": "active | passive | mixed",
  "transitionHint": "brief note on how the BEFORE text ends and AFTER text begins, to help bridge them"
}
No explanation, no markdown fences — raw JSON only.`
      ),
      new HumanMessage(
        `[TEXT BEFORE INSERTION POINT]\n${before || '(document start)'}\n\n[TEXT AFTER INSERTION POINT]\n${after || '(document end)'}`
      ),
    ]

    const response = await model.invoke(analysisMessages)
    const rawContent = typeof response.content === 'string' ? response.content : '{}'

    let styleNotes: string
    try {
      JSON.parse(rawContent)
      styleNotes = rawContent
    } catch {
      styleNotes = JSON.stringify({
        vocabularyLevel: 'intermediate',
        avgSentenceLength: 'medium',
        tense: 'past',
        person: 'third',
        tone: 'neutral',
        voice: 'active',
        transitionHint: 'unknown',
      })
    }

    return { textBefore: before, textAfter: after, styleNotes }
  }
}

// ---------------------------------------------------------------------------
// Node: generate_insertion
// Produces the insertion text guided by style notes and surrounding context.
// ---------------------------------------------------------------------------

function makeGenerateInsertionNode(model: BaseChatModel) {
  return async (state: TextContinuationState): Promise<Partial<TextContinuationState>> => {
    const { textBefore, textAfter, styleNotes } = state

    let styleDescription = styleNotes
    try {
      const parsed = JSON.parse(styleNotes) as Record<string, string>
      styleDescription = Object.entries(parsed)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    } catch {
      // Use raw string if not valid JSON
    }

    const generationMessages = [
      new SystemMessage(
        `[CONTEXT BLOCK]
You are continuing a piece of writing. Your job is to insert new content at the marked position — not rewrite, not summarize, just continue naturally.

Style profile you must match: ${styleDescription}

[DOCUMENT BLOCK]
Here is the full post. The exact insertion point is marked with ${INSERT_MARKER}:

---
${textBefore}

${INSERT_MARKER}

${textAfter}
---

[TASK BLOCK]
Write the continuation that fits at ${INSERT_MARKER}.

Requirements:
- Match the tone, voice, and style of the surrounding text
- Connect smoothly to the sentence/paragraph before AND after the marker
- Do NOT repeat the existing text
- Do NOT add a title or commentary — output only the insertion text
- If the marker falls mid-sentence, complete that sentence first before adding new content
- Produce coherent prose that reads as if it was always part of the document`
      ),
      new HumanMessage(
        `Generate the insertion text now. Output ONLY the text to be placed at the insertion point — nothing else.`
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
    .addNode('analyze_context', makeAnalyzeContextNode(model))
    .addNode('generate_insertion', makeGenerateInsertionNode(model))
    .addEdge(START, 'analyze_context')
    .addEdge('analyze_context', 'generate_insertion')
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
- Do NOT add a title or commentary — output only the insertion text
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
