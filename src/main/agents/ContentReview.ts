/**
 * ContentReview — structured editorial feedback agent.
 *
 * Runs as a five-node sequential LangGraph StateGraph:
 *   START → clarity_check → grammar_check → tone_check → structure_check → synthesize → END
 *
 * Each check node analyses one editorial dimension and stores focused feedback.
 * The synthesize node combines all four into the final structured review matching
 * the four-section format: Clarity, Grammar & Mechanics, Tone, Structure + Overall.
 *
 * Temperature is low throughout to ensure consistent, reliable analysis.
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
  clarityFeedback: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  grammarFeedback: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  toneFeedback: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  structureFeedback: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  finalReview: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
})

type ContentReviewState = typeof GraphState.State

// Shared helper to extract user text from state messages
function getUserText(state: ContentReviewState): string {
  const userMsg = state.messages.find((m): m is HumanMessage => m._getType() === 'human')
  return userMsg ? String(userMsg.content) : ''
}

// ---------------------------------------------------------------------------
// Node: clarity_check
// ---------------------------------------------------------------------------

function makeClarityCheckNode(model: BaseChatModel) {
  return async (state: ContentReviewState): Promise<Partial<ContentReviewState>> => {
    const text = getUserText(state)

    const response = await model.invoke([
      new SystemMessage(
        `You are a senior editor. Analyse ONLY the clarity of the following text.
Identify sentences or passages that are confusing, ambiguous, or unnecessarily complex.
Quote the specific text, then explain the problem and suggest a concrete rewrite.
If the writing is clear throughout, say so briefly. Be direct and specific.`
      ),
      new HumanMessage(text),
    ])

    return { clarityFeedback: typeof response.content === 'string' ? response.content : '' }
  }
}

// ---------------------------------------------------------------------------
// Node: grammar_check
// ---------------------------------------------------------------------------

function makeGrammarCheckNode(model: BaseChatModel) {
  return async (state: ContentReviewState): Promise<Partial<ContentReviewState>> => {
    const text = getUserText(state)

    const response = await model.invoke([
      new SystemMessage(
        `You are a senior editor. Analyse ONLY the grammar and mechanics of the following text.
Flag grammatical errors, punctuation issues, inconsistent capitalisation, and misused words.
Distinguish between clear errors and stylistic choices (e.g. intentional fragments, comma splices for rhythm).
Provide the corrected form for each flagged issue. Be direct and specific.`
      ),
      new HumanMessage(text),
    ])

    return { grammarFeedback: typeof response.content === 'string' ? response.content : '' }
  }
}

// ---------------------------------------------------------------------------
// Node: tone_check
// ---------------------------------------------------------------------------

function makeToneCheckNode(model: BaseChatModel) {
  return async (state: ContentReviewState): Promise<Partial<ContentReviewState>> => {
    const text = getUserText(state)

    const response = await model.invoke([
      new SystemMessage(
        `You are a senior editor. Analyse ONLY the tone of the following text.
Describe the tone the text currently projects (e.g. formal, conversational, authoritative, uncertain).
Identify tonal inconsistencies — places where the register shifts unexpectedly.
If a particular audience or purpose is implied, assess whether the tone serves it. Be direct and specific.`
      ),
      new HumanMessage(text),
    ])

    return { toneFeedback: typeof response.content === 'string' ? response.content : '' }
  }
}

// ---------------------------------------------------------------------------
// Node: structure_check
// ---------------------------------------------------------------------------

function makeStructureCheckNode(model: BaseChatModel) {
  return async (state: ContentReviewState): Promise<Partial<ContentReviewState>> => {
    const text = getUserText(state)

    const response = await model.invoke([
      new SystemMessage(
        `You are a senior editor. Analyse ONLY the structure of the following text.
Evaluate overall organisation: does the piece have a clear opening, development, and close?
Identify pacing problems: sections that drag, jumps that feel abrupt, or ideas without follow-through.
Suggest structural changes where needed, with a rationale. Be direct and specific.`
      ),
      new HumanMessage(text),
    ])

    return { structureFeedback: typeof response.content === 'string' ? response.content : '' }
  }
}

// ---------------------------------------------------------------------------
// Node: synthesize
// Combines all four feedback sections into the canonical four-section review.
// ---------------------------------------------------------------------------

function makeSynthesizeNode(model: BaseChatModel) {
  return async (state: ContentReviewState): Promise<Partial<ContentReviewState>> => {
    const synthesisMessages = [
      new SystemMessage(
        `You are a senior editor. You have received four specialist assessments of a piece of writing.
Combine them into a single, coherent editorial review using exactly these four sections in order:

**1. Clarity**
**2. Grammar & Mechanics**
**3. Tone**
**4. Structure**

End with an **Overall Assessment** of 2–3 sentences summarising the piece's strongest qualities and
the single most important area to address.

Behaviour rules:
- Be direct. Do not soften every criticism with praise.
- Be specific. Cite line-level evidence for every claim.
- Do not rewrite the entire piece — only provide targeted example rewrites.
- Do not comment on subject matter preference — only craft and execution.
- Integrate the four assessments into a unified voice rather than just concatenating them.`
      ),
      new HumanMessage(
        `Clarity assessment:\n${state.clarityFeedback}\n\n` +
        `Grammar & Mechanics assessment:\n${state.grammarFeedback}\n\n` +
        `Tone assessment:\n${state.toneFeedback}\n\n` +
        `Structure assessment:\n${state.structureFeedback}`
      ),
    ]

    const response = await model.invoke(synthesisMessages)
    const finalReview = typeof response.content === 'string' ? response.content : ''

    return {
      finalReview,
      messages: [new AIMessage(finalReview)],
    }
  }
}

// ---------------------------------------------------------------------------
// Graph factory
// ---------------------------------------------------------------------------

function buildContentReviewGraph(model: BaseChatModel) {
  const graph = new StateGraph(GraphState)
    .addNode('clarity_check', makeClarityCheckNode(model))
    .addNode('grammar_check', makeGrammarCheckNode(model))
    .addNode('tone_check', makeToneCheckNode(model))
    .addNode('structure_check', makeStructureCheckNode(model))
    .addNode('synthesize', makeSynthesizeNode(model))
    .addEdge(START, 'clarity_check')
    .addEdge('clarity_check', 'grammar_check')
    .addEdge('grammar_check', 'tone_check')
    .addEdge('tone_check', 'structure_check')
    .addEdge('structure_check', 'synthesize')
    .addEdge('synthesize', END)

  return graph.compile()
}

// ---------------------------------------------------------------------------
// Agent definition
// ---------------------------------------------------------------------------

const definition: AIAgentsDefinition = {
  id: 'content-review',
  name: 'Content Review',
  description:
    'Provides detailed editorial feedback on clarity, grammar, tone, and structure — with specific line-level suggestions and an overall assessment.',
  category: 'editing',
  defaultConfig: {
    systemPrompt: `You are a senior editor at a respected publishing house with expertise in both fiction and non-fiction.

Your reviews are valued because they are specific, honest, and constructive — never vague, never simply validating.

Structure every review using these four sections, in order:

**1. Clarity**
- Identify sentences or passages that are confusing, ambiguous, or unnecessarily complex.
- Quote the specific text, then explain the problem and suggest a concrete rewrite.
- If the writing is clear throughout, say so briefly and move on.

**2. Grammar & Mechanics**
- Flag grammatical errors, punctuation issues, inconsistent capitalisation, and misused words.
- Distinguish between clear errors and stylistic choices (e.g. intentional fragments, comma splices for rhythm).
- Provide the corrected form for each flagged issue.

**3. Tone**
- Describe the tone the text currently projects (e.g. formal, conversational, authoritative, uncertain).
- Identify tonal inconsistencies — places where the register shifts unexpectedly.
- If a particular audience or purpose is implied, assess whether the tone serves it.

**4. Structure**
- Evaluate the overall organisation: does the piece have a clear opening, development, and close?
- Identify any pacing problems: sections that drag, jumps that feel abrupt, or ideas introduced without follow-through.
- Suggest structural changes where needed, with a rationale.

**Overall Assessment**
Close with 2–3 sentences summarising the piece's strongest qualities and the single most important area to address.

Behaviour rules:
- Be direct. Do not soften every criticism with praise.
- Be specific. Cite line-level evidence for every claim.
- Do not rewrite the entire piece — only provide targeted example rewrites to illustrate a point.
- Do not comment on subject matter preference — only craft and execution.`,
    temperature: 0.3,
    maxHistoryMessages: 6,
  },
  inputHints: {
    label: 'Content to review',
    placeholder: 'Paste the text you want editorial feedback on…',
    multiline: true,
  },
  buildGraph: buildContentReviewGraph,
}

export { definition as ContentReviewAgent }
