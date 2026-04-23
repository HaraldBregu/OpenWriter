# Media Ingestion — Transcription, OCR, Resources, RAG

OpenWriter is about producing writing, but it is also a place where the
user collects the **source material** for that writing. Four ingestion
paths bring external media into the workspace:

| Path | Turns this… | …into this |
| --- | --- | --- |
| Transcription | Audio / video file | Markdown document |
| OCR | Image or scanned page | Markdown document (or text block) |
| Resources | PDF / DOCX / TXT | File indexed for retrieval |
| RAG | Indexed resources + query | Grounded answer in a document |

## Transcription

### What The User Does

1. Opens the resources area or drops a file into the workspace.
2. Picks an audio or video file.
3. Submits it as a transcription task.

Supported formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm.
Max 25 MB per call (API constraint).

### What Happens

1. A task of type `transcription` is submitted with either a
   `filePath` or base64 bytes (plus `fileName` and `mimeType`).
2. `TranscriptionTaskHandler` resolves provider/model (defaults:
   OpenAI + `whisper-1`).
3. The `TranscriptionAgent` streams the file into
   `client.audio.transcriptions.create` with the chosen `response_format`
   (`json` or `verbose_json` for segments).
4. The final transcript arrives as one blob. The handler forwards it as
   a single `delta` event so the editor (if it's the destination) can
   insert it like any other streamed response.

### What The User Sees

- Task status bar shows _Preparing audio_ → _Uploading…_ → _Finalizing_
  → _Done_.
- Progress jumps to 90% when the API has responded and 100% when the
  handler finalizes.
- The transcript appears as editable Markdown.

### Metadata Available

With `responseFormat: 'verbose_json'`:

- `language` (detected)
- `duration` (seconds)
- `segments` — list of `{ start, end, text }` time-aligned segments

Agent: `src/main/agents/transcription/transcription-agent.ts`.
Handler: `src/main/task/handlers/transcription-task-handler.ts`.

## OCR

### What The User Does

1. Opens an image (PNG, JPG, screenshot).
2. Triggers OCR — either via the resources UI or by asking an agent
   that uses the OCR tool path.

### What Happens

1. A vision-capable LLM (`gpt-4o` family or equivalent) is called with
   an `image_url` content block.
2. The prompt defaults to:

   > "Extract all readable text from this image or document. Preserve
   > line breaks and formatting."

   The user can override it (e.g. _"transcribe the handwriting as
   cleanly as possible"_).
3. The extracted text is returned as one page result.

### Language

The user can pass a `language` hint; the agent appends "Respond in
\<language\>." to the prompt.

Agent: `src/main/agents/ocr/ocr-agent.ts`.

### Known Limits

- Single-page output. Multi-page documents are handled by the calling
  code (split the document, OCR each page).
- Accuracy depends entirely on the vision model. Tabular data and
  heavy handwriting are the usual failure modes.

## Resources Library

### What It Is

The **Resources** section in the app is a lightweight library for
files the user wants to keep near a writing project — PDFs, DOCX,
TXT, Markdown notes, CSVs, and miscellaneous assets.

Sub-pages:

- **Content** — structured content files (e.g. notes, drafts, snippets)
- **Files** — any file the user chooses to drop in
- **Data** — machine-readable sources (used primarily for RAG)

Source: `src/renderer/src/pages/resources/`.

### Import

The user imports a file by:

- Drag-and-drop into the resources view, or
- A file-picker dialog

Files are copied into `workspace/files/`, `workspace/contents/`, or
`workspace/data/` depending on the destination.

### Extractors

For files the agent should be able to read, an **extractor** reduces
them to plain text:

- `.pdf` → `pdf-parse`
- `.docx` → `mammoth`
- `.txt` / `.md` → pass-through

Extractors are registered centrally so new formats can be added once
and reused by both RAG and direct-read flows.

## RAG — Retrieval-Augmented Generation

### What It Is

The **RAG agent** lets the user ask questions that are answered using
_only_ their own imported material, not the model's general knowledge.

Two phases:

1. **Ingest** — walk the resources, extract text, split into chunks,
   embed, store vectors.
2. **Query** — embed the user's question, retrieve top-K chunks, pass
   them as context, stream an answer grounded in that context.

### Chunking

- Default chunk size and overlap come from `RagAgent` defaults (see
  `src/main/agents/rag/text-splitter.ts`).
- Each chunk carries metadata: `id`, plus any caller-supplied fields
  (file name, page number, etc.).

### Retrieval

- `topK = 4` by default.
- Cosine similarity over embedding vectors from the in-memory store.
- Citations (the chunks used) are returned alongside the answer.

### System Prompt

```text
Answer using only the provided context. If the answer is not present,
say you do not know.

Context:
[1] <chunk text>
[2] <chunk text>
...
```

This is deliberately conservative — the agent is told not to invent
facts outside the retrieved context.

### Status

- The current vector store is **in-memory per RagAgent instance**.
  Restarting the app clears it. Persisting the store under
  `workspace/data/vector_store/` is a planned iteration — the path is
  already reserved by `WorkspaceService.getVectorStorePath()`.
- Embedding model: `text-embedding-3-small` by default (or any
  provider-supported embedding model the user configures).

Agent: `src/main/agents/rag/rag-agent.ts`.

## How Ingestion Paths Interact With Writing

Once material is ingested, the user can:

1. Open a document and ask a prompt that references the material. If
   the user routed the request to the RAG agent, retrieval runs first
   and the streamed answer is grounded.
2. Transcribe an audio file, then continue editing the transcript as a
   document.
3. OCR an image and paste the extracted text into the draft.
4. Combine: transcribe interviews → index as resources → ask RAG
   questions while writing → generate images for the final article.

The common denominator: whatever is ingested becomes a **file on disk**
inside the workspace. It doesn't live in a database the user can't see.

## Indexing Status

`workspace/data/indexing-info.json` stores a lightweight record of what
has been indexed (counts, timestamps). The renderer can display this so
the user knows whether their resources have been processed.
