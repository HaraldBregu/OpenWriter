# Agent Types — Capability Matrix

A single-page comparison of every built-in agent. Deep dives are in the
per-agent docs.

## Catalog

| Agent | Type id | Input shape | Output | Streaming | Uses skills | Uses RAG |
| --- | --- | --- | --- | :-: | :-: | :-: |
| Writer | `writer` | Prompt + model config + optional skills catalog | Final text + intent + step count + stop reason | yes | **yes** | yes (via tool / context) |
| Painter | `painter` (dedicated agent planned; today via `generate_image` tool inside writer/assistant) | Image prompt + size + context | Saved image path, markdown reference | partial | yes | yes |
| Assistant | `assistant` | Prompt + model config | Final text | yes | no | no |
| OCR | `ocr` | Image source (url or base64) + prompt | Extracted text + per-page records | no | no | no |
| Transcription | `transcription` | Audio/video path or base64 | Transcript, optional segments/language | final only (as single delta) | no | no |
| RAG | `rag` | `ingest` or `query` discriminator | Ingest: count; Query: answer + citations | yes (on query) | no | — |

## Streams Back To The Editor

| Event kind emitted | Writer | Painter | Assistant | OCR | Transcription | RAG |
| --- | :-: | :-: | :-: | :-: | :-: | :-: |
| `intent` | ✅ | — | — | — | — | — |
| `decision` | ✅ | — | — | — | — | — |
| `skill:selected` | ✅ | ✅ (planned) | — | — | — | — |
| `text` | ✅ | — | ✅ | — | ✅ (once) | ✅ (query only) |
| `tool` | ✅ | ✅ | ✅ (if tools wired) | — | — | — |
| `image` | ✅ (via tool) | ✅ | — | — | — | — |
| `phase` / `status` | via handler | via handler | via handler | — | via handler | via handler |

## Default Models

Set in Settings → Agents; overridable per call via
`modelName`/`providerId` on the input.

| Agent | Default model | Notes |
| --- | --- | --- |
| Writer | `gpt-4.1` (text) | Resolved from the `assistant` or `writer` agent config |
| Painter | `gpt-image-1` | Via the `generate_image` tool |
| Assistant | `gpt-4.1` | Single streaming call |
| OCR | _user-selected vision model_ | No default; UI prompts for one |
| Transcription | `whisper-1` | Can use `gpt-4o-transcribe` family |
| RAG — chat | agent's configured text model | |
| RAG — embedding | `text-embedding-3-small` | |

## Permissions The Agent Needs From The User

All agents need at least one configured provider + API key. Beyond that:

| Agent | Needs workspace? | Writes to disk? | Network calls |
| --- | :-: | :-: | --- |
| Writer | yes (for content.md) | yes (via stream writer + tools) | provider chat |
| Painter | yes (for images/ and content.md) | yes (image file + markdown reference) | provider images |
| Assistant | no | indirect (via editor) | provider chat |
| OCR | no | no | provider chat with vision |
| Transcription | yes (for audio file path) | no | provider audio |
| RAG | yes (index path reserved) | no (in-memory today) | provider embeddings + chat |

## Typical Trigger

Where each agent is typically invoked from:

| Agent | Trigger |
| --- | --- |
| Writer | Inline editor prompt, selection assistant actions, sidebar chat |
| Painter | Inside a writer prompt that mentions an image |
| Assistant | Direct API calls, minimal workflows, extensions |
| OCR | Settings → Extensions or a dedicated UI surface feeding images |
| Transcription | Resources pane, drag-drop of audio/video |
| RAG | Research flows — ingest once, then query from chat |

## What You Can't Mix (Yet)

Current product constraints worth knowing:

- **Only one agent per task.** If you want "run RAG then feed the
  context into writer", compose two task submissions on the renderer
  side.
- **No inter-agent handoff protocol.** Agents coordinate through
  shared data (files, task metadata), not direct messages.
- **No agent registry per workspace.** The catalog is app-global.
  Workspace-scoped agents are a future iteration.

## Where Each Agent Lives In Code

```
src/main/agents/
├── core/                # base class + registry + agent-errors
├── writer/              # WriterAgent + IntentNode/ControllerNode/TextNode
├── assistant/           # AssistantAgent
├── rag/                 # RagAgent + splitter + in-memory vector store
├── ocr/                 # OcrAgent
├── transcription/       # TranscriptionAgent
├── skills/              # SkillRegistry + parser + filesystem source
└── tools/               # read/write/edit/bash/grep/find/ls/generate_image
```
