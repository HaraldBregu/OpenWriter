# OpenWriter — Functional Documentation

Functional (product-level) docs for OpenWriter. Describes **what the app does
for the user**, not how the code is wired.

Each doc is self-contained; code-level references point to the source files
under `src/` so readers can drop from "what" into "how" when they want.

## What OpenWriter Is

OpenWriter (branded **SquidWriter** 🦑) is a cross-platform desktop writing app
(macOS, Windows, Linux). Its purpose is to help a single user write long-form
text — books, articles, blog posts, reports, essays — and optionally **generate
images inline** into that text while they write.

The distinguishing trait: writing is assisted by a **loop of AI agents** that
collaborate, not a single prompt-to-completion model call. Agents classify the
user intent, decide the next action, delegate to skills or tools, and stream
tokens straight into the document.

## Document Index

| Doc | Topic |
| --- | --- |
| [OVERVIEW.md](./OVERVIEW.md) | Product scope, target user, guiding principles |
| [USER_JOURNEY.md](./USER_JOURNEY.md) | First launch → open workspace → write → export |
| [WRITING_EXPERIENCE.md](./WRITING_EXPERIENCE.md) | Editor, inline prompts, assistant actions, history |
| [AI_AGENT_LOOP.md](./AI_AGENT_LOOP.md) | The agent loop — how agents work together |
| [AGENT_CAPABILITIES.md](./AGENT_CAPABILITIES.md) | Writer, Assistant, RAG, OCR, Transcription |
| [SKILLS_AND_TOOLS.md](./SKILLS_AND_TOOLS.md) | What the agent can choose and invoke |
| [WORKSPACE_AND_DOCUMENTS.md](./WORKSPACE_AND_DOCUMENTS.md) | Workspace layout, documents on disk |
| [IMAGE_GENERATION.md](./IMAGE_GENERATION.md) | Generating images into the page |
| [MEDIA_INGESTION.md](./MEDIA_INGESTION.md) | Transcription, OCR, resources library |
| [SETTINGS_AND_PROVIDERS.md](./SETTINGS_AND_PROVIDERS.md) | Providers, models, agents, themes, languages |

Extension system has its own documentation folder: see
[../extensions/README.md](../extensions/README.md).

## Quick Functional Summary

- **Input:** a workspace folder, one or more documents, an API key for at
  least one LLM provider (OpenAI, Anthropic).
- **Core act:** the user types a prompt (inline in the editor or via a
  sidebar). A Writer agent loop classifies intent, decides actions, and
  streams tokens into the document at the cursor position. Images can be
  generated and inserted in the same flow.
- **Output:** Markdown documents on disk plus generated images under the
  workspace. Files are owned by the user at all times — OpenWriter never
  takes control of the content.

## Scope

These docs cover the current shipping surface of the app. Partially
implemented or experimental behavior is flagged inline inside the relevant
doc (typically in a "Limits" or "Known limits" section).
