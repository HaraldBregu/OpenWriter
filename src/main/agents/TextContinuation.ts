/**
 * TextContinuation — inserts new content at a specific position within existing text.
 *
 * Unlike TextCompleter (which appends to the end), this agent receives the full
 * document split around a marked insertion point (<<INSERT_HERE>>) and generates
 * content that connects smoothly to both the preceding and following text.
 *
 * Runs as a plain chat completion — no graph needed because the task is a single
 * focused generation step with a rich, self-contained prompt.
 *
 * Expected prompt format (built by the caller):
 *   The prompt must contain the full document with <<INSERT_HERE>> at the
 *   insertion point, plus optional constraints (word count, topic, perspective).
 */

import type { AgentDefinition } from './AgentDefinition'

// ---------------------------------------------------------------------------
// System prompt
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
}

export { definition as TextContinuationAgent }
