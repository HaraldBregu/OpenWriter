/**
 * StoryWriter — creative story-writing assistant.
 *
 * Runs as a two-node LangGraph StateGraph:
 *   START → plan → write → END
 *
 * The plan node produces a structured story outline (JSON).
 * The write node uses that outline plus the original prompt to produce
 * the full narrative.  Temperature is set high to encourage creative variation.
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
  outline: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  draft: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
})

type StoryState = typeof GraphState.State

// ---------------------------------------------------------------------------
// Node: plan
// Asks the model for a JSON story outline (title, setting, characters, beats).
// ---------------------------------------------------------------------------

function makePlanNode(model: BaseChatModel) {
  return async (state: StoryState): Promise<Partial<StoryState>> => {
    const userMsg = state.messages.find((m): m is HumanMessage => m._getType() === 'human')
    const userPrompt = userMsg ? String(userMsg.content) : ''

    const planMessages = [
      new SystemMessage(
        `You are a story planning assistant. Given a story prompt, produce a concise JSON outline.
Return ONLY a valid JSON object with this exact shape:
{
  "title": "Story title",
  "setting": "Brief setting description",
  "characters": ["Character A — brief note", "Character B — brief note"],
  "beats": ["Opening beat", "Rising action beat", "Climax beat", "Resolution beat"]
}
No prose, no markdown fences — raw JSON only.`
      ),
      new HumanMessage(userPrompt),
    ]

    const response = await model.invoke(planMessages)
    const rawContent = typeof response.content === 'string' ? response.content : ''

    // Parse JSON, falling back to a minimal outline if parsing fails
    let outline: string
    try {
      JSON.parse(rawContent)
      outline = rawContent
    } catch {
      outline = JSON.stringify({
        title: 'Untitled Story',
        setting: 'To be determined',
        characters: [],
        beats: [userPrompt],
      })
    }

    return {
      outline,
      messages: [new AIMessage(`[Story outline]\n${outline}`)],
    }
  }
}

// ---------------------------------------------------------------------------
// Node: write
// Uses the outline + original prompt to write the full narrative.
// ---------------------------------------------------------------------------

function makeWriteNode(model: BaseChatModel) {
  return async (state: StoryState): Promise<Partial<StoryState>> => {
    const userMsg = state.messages.find((m): m is HumanMessage => m._getType() === 'human')
    const userPrompt = userMsg ? String(userMsg.content) : ''

    let outlineText = state.outline
    try {
      const parsed = JSON.parse(state.outline) as {
        title?: string
        setting?: string
        characters?: string[]
        beats?: string[]
      }
      outlineText = [
        `Title: ${parsed.title ?? ''}`,
        `Setting: ${parsed.setting ?? ''}`,
        `Characters: ${(parsed.characters ?? []).join(', ')}`,
        `Story beats:\n${(parsed.beats ?? []).map((b, i) => `  ${i + 1}. ${b}`).join('\n')}`,
      ].join('\n')
    } catch {
      // Outline wasn't JSON — use raw string
    }

    const writeMessages = [
      new SystemMessage(
        `You are an expert creative fiction writer with decades of experience across genres.

Your strengths:
- You write with vivid, concrete sensory detail that puts the reader inside the scene.
- You develop distinct character voices so each person sounds and feels unique.
- You structure scenes with a clear beginning, rising tension, and a resonant beat at the end.
- You vary sentence rhythm deliberately: short punches for action, longer flowing sentences for reflection.
- You avoid purple prose — every adjective earns its place.
- You respect the user's genre conventions while introducing surprising, earned moments.

How to behave:
- Treat every prompt as the seed of a real story worth telling.
- Never summarise the story in meta-commentary — stay in the narrative voice.
- Do not apologise for content choices or hedge with phrases like "Certainly!" or "Of course!".`
      ),
      new HumanMessage(
        `Write the full story based on this prompt and outline.\n\nPrompt: ${userPrompt}\n\nOutline:\n${outlineText}`
      ),
    ]

    const response = await model.invoke(writeMessages)
    const draft = typeof response.content === 'string' ? response.content : ''

    return {
      draft,
      messages: [new AIMessage(draft)],
    }
  }
}

// ---------------------------------------------------------------------------
// Graph factory
// ---------------------------------------------------------------------------

function buildStoryWriterGraph(model: BaseChatModel) {
  const graph = new StateGraph(GraphState)
    .addNode('plan', makePlanNode(model))
    .addNode('write', makeWriteNode(model))
    .addEdge(START, 'plan')
    .addEdge('plan', 'write')
    .addEdge('write', END)

  return graph.compile()
}

// ---------------------------------------------------------------------------
// Agent definition
// ---------------------------------------------------------------------------

const definition: AgentDefinition = {
  id: 'story-writer',
  name: 'Story Writer',
  description:
    'Crafts engaging narrative fiction — short stories, scenes, or multi-chapter drafts — with strong character voice, vivid imagery, and purposeful pacing.',
  category: 'writing',
  defaultConfig: {
    systemPrompt: `You are an expert creative fiction writer with decades of experience across genres.

Your strengths:
- You write with vivid, concrete sensory detail that puts the reader inside the scene.
- You develop distinct character voices so each person sounds and feels unique.
- You structure scenes with a clear beginning, rising tension, and a resonant beat at the end.
- You vary sentence rhythm deliberately: short punches for action, longer flowing sentences for reflection.
- You avoid purple prose — every adjective earns its place.
- You respect the user's genre conventions while introducing surprising, earned moments.

How to behave:
- Treat every prompt as the seed of a real story worth telling.
- When a prompt is vague, make bold interpretive choices and briefly note them at the end so the user can redirect.
- Ask one focused clarifying question if the prompt is completely undefined (e.g. no genre, no setting).
- Never summarise the story in meta-commentary — stay in the narrative voice.
- If asked to continue a draft, match the existing style and tone precisely before adding your own texture.
- Do not apologise for content choices or hedge with phrases like "Certainly!" or "Of course!".`,
    temperature: 0.9,
    maxHistoryMessages: 20,
  },
  inputHints: {
    label: 'Story prompt',
    placeholder:
      'Describe your story idea, genre, setting, or characters — or paste a draft to continue…',
    multiline: true,
  },
  buildGraph: buildStoryWriterGraph,
}

export { definition as StoryWriterAgent }
