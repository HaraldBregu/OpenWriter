# Transcription Agent

The **Transcription** agent turns audio or video into text. It wraps
OpenAI's Whisper and `gpt-4o-transcribe` family through the
`/audio/transcriptions` endpoint.

Source: `src/main/agents/transcription/transcription-agent.ts`.
Dedicated task handler: `src/main/task/handlers/transcription-task-handler.ts`.

## Contract

### Input

Exactly one of `filePath` or `base64` + `fileName` + `mimeType`:

```ts
interface TranscriptionAgentInput {
  source: string;                    // absolute path OR base64 bytes
  sourceKind: 'file' | 'base64';
  fileName?: string;                  // required when sourceKind === 'base64'
  mimeType?: string;                  // required when sourceKind === 'base64'
  language?: string;
  prompt?: string;                    // bias / style hint
  responseFormat?: 'json' | 'verbose_json' | 'text' | 'srt' | 'vtt';
  temperature?: number;
  providerId: string;
  apiKey: string;
  modelName: string;
}
```

### Output

```ts
interface TranscriptionAgentOutput {
  text: string;
  model: string;
  language?: string;
  duration?: number;                  // seconds
  segments?: TranscriptionSegment[];  // only when responseFormat === 'verbose_json'
}

interface TranscriptionSegment {
  start: number;                      // seconds
  end: number;
  text: string;
}
```

## Supported Formats

Delegated to the provider. As of current OpenAI limits:

```
flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm
```

Max 25 MB per call. Video containers are fine — the API extracts the
audio track.

## Default Model

`whisper-1`. Other options:

- `gpt-4o-transcribe` — higher quality, larger context
- `gpt-4o-mini-transcribe` — faster, cheaper

## How It Runs

1. **Prepare.** If `sourceKind === 'file'`, the agent creates a read
   stream and wraps it with the OpenAI SDK's `toFile`. For `base64`,
   it decodes into a `Buffer` and calls `toFile` with the supplied
   name + MIME.
2. **Upload & call.** Sends the file to
   `client.audio.transcriptions.create`.
3. **Parse.** For non-verbose formats the response is a string; for
   `verbose_json` it includes `language`, `duration`, and `segments`.
4. **Report.** Emits one `text` event with the full transcript so the
   editor (when that is the destination) inserts it as a streamed
   block.

Progress reporting:

- `10%` — "Preparing audio"
- `30%` — "Uploading to transcription API"
- `90%` — "Finalizing transcript"
- `100%` — "Transcription complete"

## Dedicated Task Handler

Transcription uses its own task handler (`TranscriptionTaskHandler`)
rather than the generic `AgentTaskHandler`. Reasons:

- Input shape is different from text-agent input (no `prompt` in the
  same sense, requires `filePath` or base64 + name + mime).
- No skill catalog injection.
- Final transcript is forwarded as a single `delta` event so the
  editor can insert it with the same mechanism used by streamed agent
  output.

## Events Emitted

- `text` — one event carrying the final transcript.
- Via the handler: `phase` events (_preparing_, _uploading_,
  _finalizing_, _done_).

## Cancellation

`ctx.signal` is threaded through to the SDK call. Cancelling aborts
the outbound upload — no partial transcript is produced.

## Practical Notes

- **Chunking large files.** The 25 MB limit is a hard constraint. For
  longer recordings, split the file (`ffmpeg`) before submitting,
  transcribe each chunk, and concatenate.
- **Language hint.** The `language` field accelerates decoding and
  improves accuracy for known-language inputs.
- **Prompts.** The `prompt` field biases the model toward domain terms,
  proper nouns, or specific phrasing (e.g. "This is a medical
  interview mentioning 'Takayasu arteritis'").
- **Segments.** `verbose_json` unlocks timestamps for building
  time-aligned transcripts or searchable media libraries.

## Failure Modes

| Failure | Behavior |
| --- | --- |
| File > 25 MB | Provider rejects; task errors. |
| Unsupported MIME | Provider rejects; task errors. |
| Invalid / missing credentials | Throws at `validate`; no API call. |
| Mid-upload cancellation | `AbortError` raised; task ends in `cancelled`. |

## Example

From an extension:

```ts
await ctx.host.tasks.submit({
  type: 'transcription',
  input: {
    filePath: '/Users/me/recordings/interview.m4a',
    language: 'en',
    responseFormat: 'verbose_json',
  },
  metadata: { documentId: 'doc-123' },
});
```

From the renderer (rough):

```ts
await window.task.submit({
  type: 'transcription',
  input: { filePath: absolutePath, responseFormat: 'verbose_json' },
});
```

## Where The Output Goes

Callers decide. Typical patterns:

- **Create a new document** from the transcript — the renderer creates
  a new document entry and inserts the transcript as its initial
  content.
- **Insert at the cursor** — the current document page listens for
  `delta` events tied to the task id and appends the transcript.
- **Post-process** — an extension chains transcription output into a
  Writer run ("summarize this interview in five bullets").
