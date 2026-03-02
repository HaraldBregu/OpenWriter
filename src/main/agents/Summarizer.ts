/**
 * Summarizer — high-fidelity long-form content summarisation agent.
 *
 * Runs as a three-node LangGraph StateGraph:
 *   START → assess → summarize → refine → END
 *
 * The assess node counts words and sets calibration metadata without any LLM call.
 * The summarize node produces the raw summary using the fidelity-focused system prompt.
 * The refine node strips inferences and calibrates bullet count.
 *
 * Temperature is low to maximise factual grounding.
 */

import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'
import type { BaseMessage } from '@langchain/core/messages'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { AIAgentsDefinition } from '../AIAgentsDefinition'

// ---------------------------------------------------------------------------
// Graph state
// ---------------------------------------------------------------------------

const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
  wordCount: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  rawSummary: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  refinedSummary: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
})

type SummarizerState = typeof GraphState.State

// ---------------------------------------------------------------------------
// Node: assess
// Pure logic — counts words, no LLM call.
// ---------------------------------------------------------------------------

function makeAssessNode() {
  return async (state: SummarizerState): Promise<Partial<SummarizerState>> => {
    const userMsg = state.messages.find((m): m is HumanMessage => m._getType() === 'human')
    const text = userMsg ? String(userMsg.content) : ''
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length
    return { wordCount }
  }
}

// ---------------------------------------------------------------------------
// Node: summarize
// Calls the model with the fidelity-focused prompt calibrated to word count.
// ---------------------------------------------------------------------------

function makeSummarizeNode(model: BaseChatModel) {
  return async (state: SummarizerState): Promise<Partial<SummarizerState>> => {
    const userMsg = state.messages.find((m): m is HumanMessage => m._getType() === 'human')
    const text = userMsg ? String(userMsg.content) : ''

    // Derive bullet target from word count
    const wc = state.wordCount
    let bulletGuidance: string
    if (wc < 500) {
      bulletGuidance = 'Use 2–4 bullet points.'
    } else if (wc <= 2000) {
      bulletGuidance = 'Use 4–8 bullet points.'
    } else {
      bulletGuidance = 'Use 8–15 bullet points, grouped by theme if appropriate.'
    }

    const response = await model.invoke([
      new SystemMessage(
        `You are an expert research analyst trained to distil long documents into precise, faithful summaries.

Core principles:
- Fidelity above all. Never include information not present in the source text. Do not infer, extrapolate, or add context from general knowledge.
- Completeness over brevity. Capture every key argument, finding, or conclusion.
- Preserve nuance. If the source hedges (e.g. "may suggest"), your summary must reflect that uncertainty.
- Neutral voice. Summarise without editorialising.

Format rules:
1. Open with a one-sentence statement of the document's subject and main conclusion or purpose.
2. Follow with a bulleted list of key points, each in one to two sentences. ${bulletGuidance}
3. If the document has a clear structure, mirror it in the bullets.
4. Close with a one-sentence note on significant caveats or open questions — only if present in the source.
5. Do not add a heading like "Summary:" — begin directly with the opening sentence.`
      ),
      new HumanMessage(text),
    ])

    return { rawSummary: typeof response.content === 'string' ? response.content : '' }
  }
}

// ---------------------------------------------------------------------------
// Node: refine
// Short refinement pass — removes inferences, calibrates bullet count.
// ---------------------------------------------------------------------------

function makeRefineNode(model: BaseChatModel) {
  return async (state: SummarizerState): Promise<Partial<SummarizerState>> => {
    const userMsg = state.messages.find((m): m is HumanMessage => m._getType() === 'human')
    const originalText = userMsg ? String(userMsg.content) : ''

    const response = await model.invoke([
      new SystemMessage(
        `You are a meticulous fact-checker for summaries. Review the provided summary against the original text.
Tasks:
1. Remove any inferences, extrapolations, or details not directly stated in the original.
2. Ensure hedging language from the source is preserved (do not flatten qualifications).
3. Verify bullet count calibration matches the source length.
Return only the refined summary — no explanation, no preamble.`
      ),
      new HumanMessage(
        `Original text:\n${originalText}\n\nSummary to refine:\n${state.rawSummary}`
      ),
    ])

    const refinedSummary = typeof response.content === 'string' ? response.content : state.rawSummary

    return {
      refinedSummary,
      messages: [new AIMessage(refinedSummary)],
    }
  }
}

// ---------------------------------------------------------------------------
// Graph factory
// ---------------------------------------------------------------------------

function buildSummarizerGraph(model: BaseChatModel) {
  const graph = new StateGraph(GraphState)
    .addNode('assess', makeAssessNode())
    .addNode('summarize', makeSummarizeNode(model))
    .addNode('refine', makeRefineNode(model))
    .addEdge(START, 'assess')
    .addEdge('assess', 'summarize')
    .addEdge('summarize', 'refine')
    .addEdge('refine', END)

  return graph.compile()
}

// ---------------------------------------------------------------------------
// Agent definition
// ---------------------------------------------------------------------------

const definition: AIAgentsDefinition = {
  id: 'summarizer',
  name: 'Summarizer',
  description:
    'Condenses long-form content into clear, faithful summaries that preserve the key arguments, facts, and conclusions — without adding anything not present in the source.',
  category: 'analysis',
  defaultConfig: {
    systemPrompt: `You are an expert research analyst trained to distil long documents into precise, faithful summaries.

Core principles:
- **Fidelity above all.** Never include information that is not present in the source text.  Do not infer, extrapolate, or add context from general knowledge.
- **Completeness over brevity.** A summary must capture every key argument, finding, or conclusion.  Leaving out a main point is a more serious failure than being slightly too long.
- **Preserve nuance.** If the source hedges (e.g. "may suggest", "preliminary evidence"), your summary must reflect that uncertainty — do not flatten qualifications.
- **Neutral voice.** Summarise without editorialising.  Do not express agreement, disagreement, or personal assessment.

Format rules:
1. Open with a one-sentence statement of the document's subject and main conclusion or purpose.
2. Follow with a bulleted list of the key points, each in one to two sentences.  Use the source's own terminology where meaningful.
3. If the document has a clear structure (sections, chapters, argument steps), mirror that structure in the bullets.
4. Close with a one-sentence note on any significant caveats, limitations, or open questions raised by the source — only if present.
5. Do not add a heading like "Summary:" — begin directly with the opening sentence.
6. Aim for roughly 15–20% of the original length, scaling down for very short inputs and up for very long or dense ones.

Length calibration:
- Input < 500 words → 2–4 bullet points
- Input 500–2000 words → 4–8 bullet points
- Input > 2000 words → 8–15 bullet points, grouped by theme if appropriate`,
    temperature: 0.3,
    maxHistoryMessages: 6,
  },
  inputHints: {
    label: 'Content to summarise',
    placeholder: 'Paste the article, document, or passage you want summarised…',
    multiline: true,
  },
  buildGraph: buildSummarizerGraph,
}

export { definition as SummarizerAgent }
