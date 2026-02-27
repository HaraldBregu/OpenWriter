/**
 * ToneAdjuster — targeted tone-rewriting agent.
 *
 * Runs as a LangGraph StateGraph with a conditional retry edge:
 *   START → detect_tone → rewrite → verify → (if failed & retryCount < 1) → rewrite
 *                                           → (otherwise) → END
 *
 * detect_tone identifies the source tone and target tone from the user's request.
 * rewrite     performs the full tone transformation.
 * verify      checks that the rewrite matched the target without losing factual content.
 * If verification fails and no retry has been used yet, routes back to rewrite.
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
  targetTone: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  currentTone: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  rewrittenText: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  verificationPassed: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
  retryCount: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
})

type ToneAdjusterState = typeof GraphState.State

// ---------------------------------------------------------------------------
// Node: detect_tone
// Identifies the current tone of the source text and the target tone
// requested by the user. Returns JSON { currentTone, targetTone }.
// ---------------------------------------------------------------------------

function makeDetectToneNode(model: BaseChatModel) {
  return async (state: ToneAdjusterState): Promise<Partial<ToneAdjusterState>> => {
    const userMsg = state.messages.find((m): m is HumanMessage => m._getType() === 'human')
    const userRequest = userMsg ? String(userMsg.content) : ''

    const response = await model.invoke([
      new SystemMessage(
        `Analyse the following user request which contains a text to rewrite and a target tone instruction.
Return ONLY a valid JSON object with these exact keys:
{
  "currentTone": "brief description of the current tone of the source text",
  "targetTone": "the tone the user wants the rewrite to use"
}
No explanation, no markdown fences — raw JSON only.`
      ),
      new HumanMessage(userRequest),
    ])

    const rawContent = typeof response.content === 'string' ? response.content : '{}'

    let currentTone = 'neutral'
    let targetTone = 'formal'

    try {
      const parsed = JSON.parse(rawContent) as { currentTone?: string; targetTone?: string }
      currentTone = parsed.currentTone ?? currentTone
      targetTone = parsed.targetTone ?? targetTone
    } catch {
      // Use defaults if parse fails
    }

    return { currentTone, targetTone }
  }
}

// ---------------------------------------------------------------------------
// Node: rewrite
// Full tone transformation using the detailed system prompt.
// Awareness of currentTone and targetTone informs the rewrite.
// ---------------------------------------------------------------------------

function makeRewriteNode(model: BaseChatModel) {
  return async (state: ToneAdjusterState): Promise<Partial<ToneAdjusterState>> => {
    const userMsg = state.messages.find((m): m is HumanMessage => m._getType() === 'human')
    const userRequest = userMsg ? String(userMsg.content) : ''

    const retryPrefix =
      state.retryCount > 0
        ? `IMPORTANT: The previous rewrite did not fully achieve the target tone. Pay extra attention to matching "${state.targetTone}" throughout.\n\n`
        : ''

    const response = await model.invoke([
      new SystemMessage(
        `You are a versatile professional editor specialising in register and tone transformation.

${retryPrefix}Current tone detected: ${state.currentTone}
Target tone requested: ${state.targetTone}

Your task is to rewrite the text in the user's request to match the target tone, while keeping the underlying meaning, facts, and intent intact.

Recognised tones you can apply:
- Formal — precise, impersonal, structured; appropriate for legal, academic, or executive audiences.
- Casual — relaxed, conversational, warm; uses contractions, shorter sentences, and everyday vocabulary.
- Persuasive — confident, benefit-focused, action-oriented; uses rhetorical structures and calls to action.
- Empathetic — emotionally attuned, validating, person-centred; acknowledges feelings before facts.
- Authoritative — decisive, evidence-grounded, no hedging; commands confidence without arrogance.
- Playful — light, witty, energetic; uses wordplay, rhythm, and a sense of fun without undermining clarity.
- Technical — precise terminology, structured explanation, assumes domain knowledge.
- Simplified — plain language, short sentences, no jargon; accessible to a broad general audience.

Rules you follow without exception:
1. Preserve all factual content. Do not add, remove, or distort information.
2. Preserve the logical structure of the original.
3. Adjust vocabulary, sentence structure, rhythm, and phrasing — do not just change a few words.
4. Do not add new opinions, examples, or statistics not present in the source.
5. After the rewrite, add a single line in parentheses briefly explaining the most significant changes made.`
      ),
      new HumanMessage(userRequest),
    ])

    const rewrittenText = typeof response.content === 'string' ? response.content : ''

    return { rewrittenText }
  }
}

// ---------------------------------------------------------------------------
// Node: verify
// Asks the model whether the rewrite successfully matched the target tone
// without losing factual content.
// ---------------------------------------------------------------------------

function makeVerifyNode(model: BaseChatModel) {
  return async (state: ToneAdjusterState): Promise<Partial<ToneAdjusterState>> => {
    const userMsg = state.messages.find((m): m is HumanMessage => m._getType() === 'human')
    const originalRequest = userMsg ? String(userMsg.content) : ''

    const response = await model.invoke([
      new SystemMessage(
        `You are a quality-assurance editor. Evaluate whether a tone rewrite successfully achieved its goal.
Return ONLY a valid JSON object:
{
  "passed": true or false,
  "reason": "brief explanation"
}
No explanation outside the JSON, no markdown fences — raw JSON only.`
      ),
      new HumanMessage(
        `Original request (contains source text + tone instruction):\n${originalRequest}\n\n` +
        `Target tone: ${state.targetTone}\n\n` +
        `Rewritten text:\n${state.rewrittenText}\n\n` +
        `Does this rewrite successfully match the target tone "${state.targetTone}" without losing any factual content from the original?`
      ),
    ])

    const rawContent = typeof response.content === 'string' ? response.content : '{}'

    let verificationPassed = true
    try {
      const parsed = JSON.parse(rawContent) as { passed?: boolean }
      verificationPassed = parsed.passed ?? true
    } catch {
      // Default to passed if we can't parse — avoid infinite loops
    }

    // If passed (or this is already a retry), emit the final answer
    const isLastAttempt = !verificationPassed && state.retryCount >= 1
    if (verificationPassed || isLastAttempt) {
      return {
        verificationPassed: true, // treat last attempt as terminal
        messages: [new AIMessage(state.rewrittenText)],
      }
    }

    return { verificationPassed: false }
  }
}

// ---------------------------------------------------------------------------
// Routing function for the conditional edge after verify
// ---------------------------------------------------------------------------

function routeAfterVerify(state: ToneAdjusterState): 'rewrite' | typeof END {
  if (!state.verificationPassed && state.retryCount < 1) {
    return 'rewrite'
  }
  return END
}

// ---------------------------------------------------------------------------
// Graph factory
// ---------------------------------------------------------------------------

function buildToneAdjusterGraph(model: BaseChatModel) {
  const graph = new StateGraph(GraphState)
    .addNode('detect_tone', makeDetectToneNode(model))
    .addNode('rewrite', makeRewriteNode(model))
    .addNode('verify', makeVerifyNode(model))
    .addEdge(START, 'detect_tone')
    .addEdge('detect_tone', 'rewrite')
    .addEdge('rewrite', 'verify')
    .addConditionalEdges('verify', routeAfterVerify, {
      rewrite: 'rewrite',
      [END]: END,
    })

  return graph.compile()
}

// ---------------------------------------------------------------------------
// Agent definition
// ---------------------------------------------------------------------------

const definition: AgentDefinition = {
  id: 'tone-adjuster',
  name: 'Tone Adjuster',
  description:
    'Rewrites content to match a specified tone — formal, casual, persuasive, empathetic, authoritative, and more — while preserving the original meaning and all key facts.',
  category: 'editing',
  defaultConfig: {
    systemPrompt: `You are a versatile professional editor specialising in register and tone transformation.

Your task is to rewrite text so it matches the tone the user requests, while keeping the underlying meaning, facts, and intent intact.

Recognised tones you can apply:
- **Formal** — precise, impersonal, structured; appropriate for legal, academic, or executive audiences.
- **Casual** — relaxed, conversational, warm; uses contractions, shorter sentences, and everyday vocabulary.
- **Persuasive** — confident, benefit-focused, action-oriented; uses rhetorical structures and calls to action.
- **Empathetic** — emotionally attuned, validating, person-centred; acknowledges feelings before facts.
- **Authoritative** — decisive, evidence-grounded, no hedging; commands confidence without arrogance.
- **Playful** — light, witty, energetic; uses wordplay, rhythm, and a sense of fun without undermining clarity.
- **Technical** — precise terminology, structured explanation, assumes domain knowledge.
- **Simplified** — plain language, short sentences, no jargon; accessible to a broad general audience.

Rules you follow without exception:
1. Preserve all factual content.  Do not add, remove, or distort information.
2. Preserve the logical structure: if the original has three arguments, the rewrite must too.
3. Adjust vocabulary, sentence structure, rhythm, and phrasing to match the target tone — do not just change a few words.
4. Do not add new opinions, examples, or statistics not present in the source.
5. If the user does not specify a tone, ask which tone they want before rewriting.
6. After the rewrite, add a single line in parentheses briefly explaining the most significant changes made (e.g. "(Replaced passive constructions with active voice; removed jargon; shortened sentences for directness.)").
7. If the requested tone conflicts with meaning preservation (e.g. "make this academic but also add jokes"), flag the tension and ask for clarification rather than guessing.`,
    temperature: 0.6,
    maxHistoryMessages: 10,
  },
  inputHints: {
    label: 'Text to rewrite',
    placeholder:
      'Paste your text and specify the target tone, e.g. "Rewrite this to be more casual" or "Make this formal and authoritative"…',
    multiline: true,
  },
  buildGraph: buildToneAdjusterGraph,
}

export { definition as ToneAdjusterAgent }
