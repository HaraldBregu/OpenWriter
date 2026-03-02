/**
 * DemoAgent — simple utility agent using plain chat completion (no LangGraph).
 *
 * Answers general questions with concise, interesting responses.
 * Uses the default AgentExecutor chat completion path since no buildGraph is provided.
 */

import type { AgentDefinition } from './AgentDefinition'

const definition: AgentDefinition = {
  id: 'demo-agent',
  name: 'Demo Agent',
  description:
    'A general-purpose assistant that answers questions with concise, interesting responses. Great for testing the agent pipeline.',
  category: 'utility',
  defaultConfig: {
    systemPrompt:
      'You are a helpful assistant that provides concise, interesting responses. Keep answers to 2-3 short paragraphs maximum.',
    temperature: 0.3,
    maxTokens: 512,
    maxHistoryMessages: 6,
  },
  inputHints: {
    label: 'Your question',
    placeholder:
      'Ask anything, or leave the default prompt to see a quick demo…',
  },
}

export { definition as DemoAgent }
