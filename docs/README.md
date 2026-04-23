# OpenWriter Documentation

This folder holds all documentation for OpenWriter, grouped by purpose.

## Functional Docs — `functional/`

Product-level documentation: what the app does, how the user interacts
with it, and what the agent loop produces.

Start at [functional/README.md](./functional/README.md).

Individual docs:

- [Overview](./functional/OVERVIEW.md) — scope, target user, principles, non-goals
- [User Journey](./functional/USER_JOURNEY.md) — first launch → workspace → write → export
- [Writing Experience](./functional/WRITING_EXPERIENCE.md) — editor, inline prompts, assistant actions, history
- [AI Agent Loop](./functional/AI_AGENT_LOOP.md) — how the Writer agent iterates: intent, decision, text, skills
- [Agent Capabilities](./functional/AGENT_CAPABILITIES.md) — Writer, Assistant, RAG, OCR, Transcription
- [Skills And Tools](./functional/SKILLS_AND_TOOLS.md) — user-authored workflows and built-in tool surface
- [Workspace And Documents](./functional/WORKSPACE_AND_DOCUMENTS.md) — on-disk layout, documents, recent list, watching
- [Image Generation](./functional/IMAGE_GENERATION.md) — inline image production into the document
- [Media Ingestion](./functional/MEDIA_INGESTION.md) — transcription, OCR, resources library, RAG
- [Settings And Providers](./functional/SETTINGS_AND_PROVIDERS.md) — providers, models, agents, themes, languages

## Agents Docs — `agents/`

Deep dive on the built-in AI agents, skills, tools, and retrieval.

Start at [agents/README.md](./agents/README.md).

Individual docs:

- [Overview](./agents/OVERVIEW.md) — agent concept, runtime model, lifecycle, dispatch, events
- [Agent Types](./agents/AGENT_TYPES.md) — capability matrix across every built-in agent
- [Writer](./agents/WRITER.md) — intent / controller / text loop, skills, stopping conditions
- [Painter](./agents/PAINTER.md) — image generation agent (current + planned dedicated form)
- [Assistant](./agents/ASSISTANT.md) — minimal one-shot streaming path
- [OCR](./agents/OCR.md) — vision-LLM text extraction
- [Transcription](./agents/TRANSCRIPTION.md) — audio/video → text
- [Embedding And RAG](./agents/EMBEDDING_AND_RAG.md) — chunking, embeddings, vector store, retrieval
- [Skills](./agents/SKILLS.md) — portable markdown workflows with optional scripts
- [RAG Augmentation](./agents/RAG_AUGMENTATION.md) — feeding retrieval into Writer and Painter
- [Authoring](./agents/AUTHORING.md) — adding a new agent to the registry

## Extensions Docs — `extensions/`

Everything about the extension system: manifest, host API, contributions,
permissions, authoring guide.

Start at [extensions/README.md](./extensions/README.md).

Individual docs:

- [Overview](./extensions/OVERVIEW.md) — what extensions are, runtime model, capability summary
- [Manifest](./extensions/MANIFEST.md) — `openwriter.extension.json` reference
- [Lifecycle](./extensions/LIFECYCLE.md) — install → bootstrap → activate → deactivate
- [Host API](./extensions/HOST_API.md) — `ctx.host.*` methods: app, workspace, documents, tasks
- [Contributions](./extensions/CONTRIBUTIONS.md) — commands and doc-panel blocks
- [Events And Storage](./extensions/EVENTS_AND_STORAGE.md) — event streams + per-extension kv store
- [Customization](./extensions/CUSTOMIZATION.md) — tokens, data, configuration patterns
- [Permissions And Security](./extensions/PERMISSIONS_AND_SECURITY.md) — permission model, sandbox, threat model
- [Building](./extensions/BUILDING.md) — scaffold, code, build, install, debug
- [Example](./extensions/EXAMPLE.md) — tour of the bundled `DemoOpenWriterExtension`

## Website Content — `web/`

Content and copy for the marketing site lives under [web/](./web/).
