# OpenWriter Agents — Documentation

Everything about the **AI agents** that power OpenWriter: what they are,
how they coordinate, how they use skills and retrieval, and how to
extend the catalog.

## Who This Is For

- **Users** — understand what each agent does and when to reach for it.
- **Extension authors** — learn the agent types you can submit tasks to.
- **Contributors** — add a new agent or evolve an existing one.

## Agents, In One Page

An **agent** is a strategy object that takes input, runs an AI workflow,
and returns structured output. Every agent:

- Is registered once in `AgentRegistry` (`src/main/agents/core/agent-registry.ts`)
- Is dispatched by type through `AgentTaskHandler`
- Runs inside a task, so it gets cancellation, progress, event streaming,
  and queuing for free
- Resolves provider, API key, and model name from the user's Settings
  unless the caller overrides them

## Built-In Agents

| Agent | Type id | Does |
| --- | --- | --- |
| Writer | `writer` | Controlled writing loop — intent → controller → text; can pick a skill |
| Painter | `painter` (planned; image work ships today through the `generate_image` tool inside the writer) | Produce images for the current context |
| Assistant | `assistant` | One-shot streaming completion for quick text or mixed output |
| OCR | `ocr` | Extract text from an image via a vision model |
| Transcription | `transcription` | Audio / video → text via Whisper or `gpt-4o-transcribe` |
| RAG | `rag` | Embed documents into a vector store, then answer questions from retrieved chunks |

## Document Index

| Doc | Topic |
| --- | --- |
| [OVERVIEW.md](./OVERVIEW.md) | Agent concept, runtime model, lifecycle, dispatch, events |
| [AGENT_TYPES.md](./AGENT_TYPES.md) | Capability matrix across all built-in agents |
| [WRITER.md](./WRITER.md) | Writer agent — intent / controller / text loop, skills, stopping conditions |
| [PAINTER.md](./PAINTER.md) | Image generation agent (current + planned dedicated form) |
| [ASSISTANT.md](./ASSISTANT.md) | Assistant agent — simple one-shot streaming path |
| [OCR.md](./OCR.md) | OCR agent — vision-LLM text extraction |
| [TRANSCRIPTION.md](./TRANSCRIPTION.md) | Transcription agent — audio/video → text |
| [EMBEDDING_AND_RAG.md](./EMBEDDING_AND_RAG.md) | Chunking, embeddings, vector store, retrieval |
| [SKILLS.md](./SKILLS.md) | Skills as portable markdown, scripts, runtime loading |
| [RAG_AUGMENTATION.md](./RAG_AUGMENTATION.md) | Feeding retrieval context into writer and painter |
| [AUTHORING.md](./AUTHORING.md) | Adding a new agent to the registry |

## Source Map

- `src/main/agents/core/` — base agent class, registry, error types
- `src/main/agents/writer/` — writer agent + nodes
- `src/main/agents/assistant/` — assistant agent
- `src/main/agents/rag/` — RAG agent, text splitter, vector store
- `src/main/agents/ocr/` — OCR agent
- `src/main/agents/transcription/` — transcription agent
- `src/main/agents/skills/` — skill registry, parser, repository
- `src/main/agents/tools/` — tools agents can call (`generate_image`,
  `read`, `write`, etc.)
- `src/main/task/handlers/agent-task-handler.ts` — bridge between the
  task system and the agent registry

## Reference Influences

The agent model borrows design ideas from widely-used agent patterns
in the broader ecosystem:

- Anthropic **Agent Skills** — markdown + frontmatter skill files the
  model can discover and invoke. See the
  [Anthropic Agent Skills overview](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
  and [spec in the skills repo](https://github.com/anthropics/skills).
- **Multi-agent creative systems** — conceptualize, generate, critique
  (e.g. [CREA](https://arxiv.org/html/2504.05306v1),
  [GenArtist](https://arxiv.org/html/2407.05600v1)).
- **RAG best practices** — chunking, embeddings, vector search
  ([Microsoft Learn RAG guide](https://learn.microsoft.com/en-us/azure/developer/ai/advanced-retrieval-augmented-generation)).

OpenWriter does not adopt those systems wholesale — it ships a smaller,
writer-first subset that fits a desktop app.

## Sources

- [Extend Claude with skills — Claude Code Docs](https://code.claude.com/docs/en/skills)
- [anthropics/skills — public Agent Skills repo](https://github.com/anthropics/skills)
- [Equipping agents for the real world with Agent Skills — Anthropic](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [CREA: Collaborative Multi-Agent Framework for Creative Content Generation (arXiv)](https://arxiv.org/html/2504.05306v1)
- [GenArtist: Multimodal LLM as an Agent for Unified Image Generation and Editing (arXiv)](https://arxiv.org/html/2407.05600v1)
- [Build Advanced Retrieval-Augmented Generation Systems — Microsoft Learn](https://learn.microsoft.com/en-us/azure/developer/ai/advanced-retrieval-augmented-generation)
- [What is RAG? — AWS](https://aws.amazon.com/what-is/retrieval-augmented-generation/)
