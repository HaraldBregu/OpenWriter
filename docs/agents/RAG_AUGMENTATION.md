# RAG Augmentation — Grounding Writer And Painter

The RAG agent on its own answers questions from indexed material. The
more interesting use case in a writing app is **feeding retrieval
results into the Writer or Painter** so the text or images they produce
are anchored in the user's own sources.

This doc describes the patterns for doing that.

## Why Augment?

A plain Writer run produces fluent, generic text. That is fine for
creative writing. It is not fine when:

- The document must cite specific facts from the user's research.
- The style must match a corpus of existing material.
- The image should reference concepts that actually appear in the
  source (names, places, dates, visual cues).

RAG augmentation turns "write something plausible" into "write
something plausible **and faithful to these sources**".

## The Three Patterns

### 1. Pre-Retrieval (Writer Consumes Snippets)

The caller runs a retrieval step **before** submitting to the Writer
and bakes snippets into the prompt.

```text
┌─ renderer or extension ─┐
│  1. query RAG ──► chunks │
│  2. build prompt with    │
│     snippets             │
│  3. submit writer task   │
└──────────────────────────┘
```

Example composed prompt:

```text
You are writing a section about the 1912 foghorn tower.

Use only the following sources. If a claim is not supported by the
sources, skip it.

[1] "The Punta Licosa lighthouse was built in 1912..."
[2] "The foghorn tower has two rings of windows..."
[3] "Keepers rotated every six weeks..."

Now write a 400-word passage in the voice of the current document.
```

Pros:
- Simple. No agent changes.
- Works today.

Cons:
- Two task submissions (RAG query + Writer run).
- The Writer's `ControllerNode` doesn't know the sources exist — its
  decision is made on the prompt alone.

### 2. Retriever Node Inside The Writer (Planned)

A `RetrieverNode` added between `IntentNode` and `ControllerNode`
that:

1. Embeds the user prompt.
2. Pulls the top-K chunks from the workspace vector store.
3. Emits a `retrieval` event with the chunks.
4. Passes them forward as loop state the controller and text nodes
   can read.

The text node's system prompt grows a dedicated `## Sources` section
built from the retrieved chunks, with the same strict "use only these"
instruction the RAG agent uses today.

Benefits:
- Single task, one lifecycle.
- Controller can skip retrieval when intent is `continue` or
  `rewrite` (no external facts needed).
- Citations surface in the same event stream as the text.

This is not shipping yet. The design is straightforward because the
writer's nodes already pass loop state; adding a new field is additive.

### 3. Painter With Grounded Prompts

For the Painter (planned — today via tool):

1. Retrieve chunks by description ("the lighthouse", "the foghorn
   tower").
2. Build an image prompt that explicitly anchors on the retrieved
   material ("a lighthouse with two rings of windows at sunset, as
   described in the source").
3. Select a style skill (e.g. `watercolor`) — [SKILLS.md](./SKILLS.md).
4. Call the image model.

This pattern shines when the user is writing about specific people,
places, or objects and wants images that reflect their actual
descriptions — not generic stock-image imagination.

## Where The Vectors Come From

Augmentation only works if the user has ingested source material:

- **Resources library.** Imported PDFs / DOCX / TXT are extracted
  (via `pdf-parse`, `mammoth`, plain reads) and ingested via the RAG
  agent in `kind: 'ingest'` mode.
- **Workspace documents.** Existing documents can also be ingested so
  the Writer has access to the project's earlier chapters.

See [EMBEDDING_AND_RAG.md](./EMBEDDING_AND_RAG.md) for chunking and
embedding details.

## Prompt Template For Grounded Writing

A template the caller can reuse today:

```text
You are writing {intent} for the current document.

Voice guidelines:
- Match the tone of surrounding paragraphs.
- Do not introduce new facts outside the sources below.
- If a claim is not supported, skip it.

## Sources
[1] {chunk 1 text}

[2] {chunk 2 text}

[3] {chunk 3 text}

## Instruction
{the user's original prompt}
```

## Citations In The Editor

Two UI choices once grounding is in place:

- **Inline refs.** Write `[1]`, `[2]` markers in the body and keep a
  footnote list at the bottom of the document.
- **Sidebar evidence panel.** Render citations alongside the editor
  (next to the task status bar) so users see what the agent relied on
  without cluttering the text.

The app supports the second approach today — `RagQueryOutput.citations`
is an array of `DocumentChunk` with metadata.

## Failure Modes

| Scenario | Safer behavior |
| --- | --- |
| No chunks retrieved | Tell the user "I don't have sources on X" rather than hallucinate. |
| Retrieved chunks are off-topic | Lower `topK`, re-chunk, or add more source material. |
| Model still hallucinates | Tighten the system prompt ("use only sources; respond 'not in sources' when missing"). |
| Chunks too long for context window | Reduce `chunkSize`; prefer more chunks over fewer-and-large. |

## When Not To Augment

- **Creative writing** — adding sources to a short story is noise.
- **Style rewrites** — the Writer already has the selection in context.
- **Grammar fixes / translation** — no need for external facts.

Augmentation is worth the extra step when factual accuracy matters
more than flow.

## Minimum Viable Augmentation

If you want to ship the pattern today from the renderer, a 20-line
function works:

```ts
async function groundedWrite(prompt: string) {
  const rag = await window.task.submit({
    type: 'agent',
    input: {
      agentType: 'rag',
      input: { kind: 'query', query: prompt, topK: 6, chatModel: 'gpt-4.1' /* ... */ },
    },
  });
  const chunks = await awaitResult(rag.data.taskId); // helper that resolves on completion

  const composed = buildGroundedPrompt(prompt, chunks.citations);

  await window.task.submit({
    type: 'agent',
    input: { agentType: 'writer', input: { prompt: composed } },
  });
}
```

That is pattern 1 — good enough for most cases until the Writer gains
a first-class retriever node.

## Reference Reading

- [What is RAG? — AWS](https://aws.amazon.com/what-is/retrieval-augmented-generation/) —
  the canonical definition.
- [Build Advanced Retrieval-Augmented Generation Systems — Microsoft Learn](https://learn.microsoft.com/en-us/azure/developer/ai/advanced-retrieval-augmented-generation) —
  chunking, hybrid search, hierarchical indexes.
- [CREA multi-agent creative framework (arXiv)](https://arxiv.org/html/2504.05306v1) —
  specialist agents cooperating on image generation.
- [GenArtist (arXiv)](https://arxiv.org/html/2407.05600v1) — one of the
  influences for the Painter-as-agent design.
