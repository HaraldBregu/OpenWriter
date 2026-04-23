# Agent Capabilities

OpenWriter ships with **five agent types**. Each is a strategy object
registered in the `AgentRegistry` (`src/main/agents/`) and invoked via a
task of type `agent` (or a dedicated handler like `transcription`).

| Agent | Type id | Purpose | Streams |
| --- | --- | --- | --- |
| Writer | `writer` | Controlled writing loop (default for the editor) | Yes |
| Assistant | `assistant` | One-shot streaming completion | Yes |
| RAG | `rag` | Document ingest + grounded answering | Yes (on query) |
| OCR | `ocr` | Extract text from images | No (single response) |
| Transcription | `transcription` | Audio/video → text | Partial (final blob as a single delta) |

## Writer Agent

**What it does.** Runs the bounded controller loop described in
[AI_AGENT_LOOP.md](./AI_AGENT_LOOP.md). Given a user prompt, classifies
intent, picks an action, and streams text. Can delegate to a named skill.

**Inputs.**
- `prompt` — the user's instruction (plus surrounding document context)
- `providerId`, `apiKey`, `modelName` — resolved from Settings if absent
- `skills` — catalog the controller can pick from (resolved from
  `SkillsStoreService` when the writer is invoked via a task)
- `temperature`, `maxTokens`, `maxSteps`, `perCallTimeoutMs` — optional

**Outputs.**
- `content` — the full streamed text
- `intent` — the classified intent
- `steps` — number of controller iterations
- `stoppedReason` — `done` or `max-steps`

**When used.** Every inline prompt, selection action, and chat message
from the document page.

Source: `src/main/agents/writer/writer-agent.ts`.

## Assistant Agent

**What it does.** Sends one chat completion request with a fixed writing
system prompt and streams content. No intent classification, no skill
selection, no tool loop.

**When used.** Simple one-shot calls where controller overhead is
unnecessary. Can be invoked by other surfaces that want raw streaming.

Source: `src/main/agents/assistant/assistant-agent.ts`.

## RAG Agent

**What it does.** Two modes:

- `kind: 'ingest'` — accepts an array of `{ id, content, metadata? }`
  documents, chunks them with configurable `chunkSize` / `chunkOverlap`,
  embeds each chunk, and stores them in an in-memory vector store.
- `kind: 'query'` — accepts a natural-language `query`, embeds it,
  retrieves the top-K matching chunks, and streams an answer grounded in
  only that context.

**Defaults.**
- `topK = 4`
- System prompt: _"Answer using only the provided context. If the answer
  is not present, say you do not know."_

**When used.** Research workflows where the user has imported PDFs, DOCX,
or plain text into the workspace as **resources** and wants the answer
grounded in that material.

**Limits.**
- Current vector store is in-memory and per-agent-instance (no on-disk
  persistence between runs yet — see the RAG code for details).
- Answers are explicitly anchored to retrieved chunks. Citations are
  returned alongside the answer.

Source: `src/main/agents/rag/`.

## OCR Agent

**What it does.** Extracts readable text from an image or document image
via a vision-capable LLM. Wraps the OpenAI-compatible `chat/completions`
endpoint with an `image_url` content block.

**Inputs.**
- `source` — either a URL or base64-encoded bytes
- `sourceKind` — `'url'` or `'base64'`
- `mimeType` — required when `sourceKind === 'base64'`
- `prompt` — optional override; defaults to _"Extract all readable text
  from this image or document. Preserve line breaks and formatting."_
- `language` — optional response language hint

**Outputs.**
- `text` — flattened extracted text
- `pages` — currently a single-page result `[{ index: 0, text }]`
- `model` — the model actually used

**When used.** Any time the user wants to turn an image into editable
text (scanned notes, screenshots of documents, etc.).

Source: `src/main/agents/ocr/ocr-agent.ts`.

## Transcription Agent

**What it does.** Audio/video → text via OpenAI Whisper or the
`gpt-4o-transcribe` family.

**Inputs.**
- Either `filePath` (absolute path to a file on disk) **or** `base64`
  (plus `fileName` and `mimeType`). Exactly one.
- `language`, `prompt`, `responseFormat` (`json` / `verbose_json` /
  text variants), `temperature` — all optional.

**Outputs.**
- `text` — full transcript
- `language`, `duration`, `segments` — populated when
  `responseFormat === 'verbose_json'`

**Limits.**
- Supported formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm
- Max 25 MB per call (provider constraint)

Source: `src/main/agents/transcription/transcription-agent.ts`.

## Agent Registration And Dispatch

All agents are registered once in `bootstrap.ts`:

```ts
agentRegistry.register(new AssistantAgent());
agentRegistry.register(new WriterAgent());
agentRegistry.register(new RagAgent());
agentRegistry.register(new OcrAgent());
agentRegistry.register(new TranscriptionAgent());
```

The renderer submits a task:

```ts
window.task.submit({
  type: 'agent',
  input: { agentType: 'writer', input: { prompt, ... } },
  metadata,
});
```

`AgentTaskHandler` then:

1. Looks up the agent by `agentType`.
2. Enriches the input with `providerId`, `apiKey`, `modelName` from
   Settings (unless already provided).
3. For the writer agent, injects the current skill catalog.
4. Runs the agent with a context that forwards events back to the
   renderer via `task:event`.

Transcription has a **dedicated task handler** (`transcription-task-handler.ts`)
because its input shape differs and it doesn't need the writer's skill
catalog plumbing.

## Choosing A Model Per Agent

Each registered agent in Settings has a `models` field:

```ts
{
  id: 'assistant',
  name: 'Assistant Agent',
  models: {
    text: DEFAULT_TEXT_MODEL_ID,
    image: DEFAULT_IMAGE_MODEL_ID,
  },
}
```

The handler's `enrichInput` step resolves:

- `modelName` from explicit input **or** the agent's configured text model
- `providerId` from the model's known provider
- `apiKey` from the provider's configured service

The user can point each agent at different providers and models without
touching code.

## Model Catalog

Flagship models shipped in the catalog (`src/shared/models.ts`):

- OpenAI: GPT-5.4, GPT-5.4 Mini, GPT-4.1, o3, o4 Mini, GPT Image 1,
  text-embedding-3-small, Whisper v1, GPT-4o Transcribe, GPT-4o Mini
  Transcribe
- Anthropic: Claude Opus 4.6, Claude Sonnet 4.6, Claude Haiku 4.5

Defaults:

| Use | Default model |
| --- | --- |
| Text | `gpt-4.1` |
| Embedding | `text-embedding-3-small` |
| Image | `gpt-image-1` |
| Transcription | `whisper-1` |
| OCR | none (user picks) |
