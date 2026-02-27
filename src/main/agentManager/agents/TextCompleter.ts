/**
 * TextCompleter — style-faithful text continuation assistant.
 *
 * Runs as a two-node LangGraph StateGraph:
 *   START → analyze_style → complete → END
 *
 * The analyze_style node extracts style metadata (vocabulary, rhythm, tense,
 * person, tone, voice) from the user's text at low temperature.
 * The complete node uses those style notes to produce a faithful continuation.
 */

import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'
import type { BaseMessage } from '@langchain/core/messages'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { AgentDefinition } from '../AgentDefinition'

// ---------------------------------------------------------------------------
// Graph state
// ---------------------------------------------------------------------------

const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
  styleNotes: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  completion: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
})

type TextCompleterState = typeof GraphState.State

// ---------------------------------------------------------------------------
// Node: analyze_style
// Low-temperature style analysis — returns a JSON style profile.
// ---------------------------------------------------------------------------

function makeAnalyzeStyleNode(model: BaseChatModel) {
  return async (state: TextCompleterState): Promise<Partial<TextCompleterState>> => {
    const userMsg = state.messages.find((m): m is HumanMessage => m._getType() === 'human')
    const userText = userMsg ? String(userMsg.content) : ''

    const analysisMessages = [
      new SystemMessage(
        `Analyze the style of the following text. Return ONLY a valid JSON object with these exact keys:
{
  "vocabularyLevel": "simple | intermediate | advanced | technical",
  "avgSentenceLength": "short | medium | long | mixed",
  "tense": "past | present | future | mixed",
  "person": "first | second | third",
  "tone": "brief description of tone",
  "voice": "active | passive | mixed"
}
No explanation, no markdown fences — raw JSON only.`
      ),
      new HumanMessage(userText),
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
      })
    }

    return { styleNotes }
  }
}

// ---------------------------------------------------------------------------
// Node: complete
// Produces a style-faithful continuation guided by the style notes.
// ---------------------------------------------------------------------------

function makeCompleteNode(model: BaseChatModel) {
  return async (state: TextCompleterState): Promise<Partial<TextCompleterState>> => {
    const userMsg = state.messages.find((m): m is HumanMessage => m._getType() === 'human')
    const userText = userMsg ? String(userMsg.content) : ''

    let styleDescription = state.styleNotes
    try {
      const parsed = JSON.parse(state.styleNotes) as Record<string, string>
      styleDescription = Object.entries(parsed)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    } catch {
      // Use raw string if not JSON
    }

    const completionMessages = [
      new SystemMessage(
        `You are a precise text-completion engine — not a conversational assistant.

Your sole job is to continue the text the user provides, as if you were the same author picking up mid-thought.

Style profile of the text you must match: ${styleDescription}

Rules you follow without exception:
1. Match the existing vocabulary level, sentence length and rhythm, tense, person, and voice exactly.
2. Do not introduce new characters, plot elements, or topics unless the user's text strongly implies them.
3. Do not summarise, comment on, or critique the text — only continue it.
4. Do not add a heading, label, or preamble. Your response begins immediately where the user's text ends.
5. Complete to a natural stopping point (end of sentence, paragraph, or scene beat) — do not trail off mid-thought.
6. Keep the completion proportionate: a single sentence yields one or two sentences; a paragraph yields a similar-length continuation.`
      ),
      new HumanMessage(userText),
    ]

    const response = await model.invoke(completionMessages)
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

function buildTextCompleterGraph(model: BaseChatModel) {
  const graph = new StateGraph(GraphState)
    .addNode('analyze_style', makeAnalyzeStyleNode(model))
    .addNode('complete', makeCompleteNode(model))
    .addEdge(START, 'analyze_style')
    .addEdge('analyze_style', 'complete')
    .addEdge('complete', END)

  return graph.compile()
}

// ---------------------------------------------------------------------------
// Agent definition
// ---------------------------------------------------------------------------

const definition: AgentDefinition = {
  id: 'text-completer',
  name: 'Text Completer',
  description:
    'Continues text naturally from where the user stopped, matching their vocabulary, sentence length, tone, and register without introducing new topics unprompted.',
  category: 'writing',
  defaultConfig: {
    systemPrompt: `You are a precise text-completion engine — not a conversational assistant.

Your sole job is to continue the text the user provides, as if you were the same author picking up mid-thought.

Rules you follow without exception:
1. Match the existing vocabulary level. If the text uses simple words, stay simple. If it uses technical or literary language, mirror it.
2. Match sentence length and rhythm. Short, punchy sentences stay short. Long, clause-heavy sentences stay long.
3. Match tense, person, and voice (active/passive) exactly.
4. Do not introduce new characters, plot elements, or topics unless the user's text strongly implies them.
5. Do not summarise, comment on, or critique the text — only continue it.
6. Do not add a heading, label, or preamble. Your response begins immediately where the user's text ends.
7. Complete to a natural stopping point (end of sentence, paragraph, or scene beat) — do not trail off mid-thought.
8. If the text is clearly incomplete mid-sentence, finish that sentence first before adding anything new.
9. Keep the completion proportionate to what was provided: a single sentence should yield one or two sentences; a paragraph should yield a similar-length continuation.
10. When the context is ambiguous, choose the most conservative, coherent interpretation.`,
    temperature: 0.4,
    maxHistoryMessages: 10,
  },
  inputHints: {
    label: 'Text to continue',
    placeholder: 'Paste the text you want completed…',
    multiline: true,
  },
  buildGraph: buildTextCompleterGraph,
}

export { definition as TextCompleterAgent }
