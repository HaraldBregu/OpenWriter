# OCR Agent

The **OCR** agent extracts text from an image using a vision-capable
LLM. Unlike classical OCR engines, it doesn't rely on on-device
recognition — it sends the image to the model and asks for a
transcription.

Source: `src/main/agents/ocr/ocr-agent.ts`.

## Contract

### Input

```ts
interface OcrAgentInput {
  source: string;                   // url OR base64-encoded bytes
  sourceKind: 'url' | 'base64';
  mimeType?: string;                // required when sourceKind === 'base64'
  prompt?: string;                  // override the default
  language?: string;                // response language hint
  providerId: string;
  apiKey: string;
  modelName: string;                // a vision-capable model
}
```

### Output

```ts
interface OcrAgentOutput {
  text: string;                     // flattened extracted text
  pages: OcrPage[];                 // currently a single-page result
  model: string;                    // the model actually used
}

interface OcrPage {
  index: number;
  text: string;
}
```

## Default Prompt

```
Extract all readable text from this image or document. Preserve line
breaks and formatting.
```

If the user passes `language: 'it'`, the agent appends `Respond in it.`
so the model answers in Italian (useful for mixed-language documents).

## How It Works

1. Build an OpenAI client. Anthropic is reached via its
   `https://api.anthropic.com/v1/` base URL; other providers use the
   default OpenAI-compatible endpoint.
2. Compose a user message with a text part and an `image_url` part:

   ```ts
   content: [
     { type: 'text',      text: `${prompt}${languageHint}` },
     { type: 'image_url', image_url: { url: imageUrl } },
   ]
   ```

3. `url` is either:
   - the caller-supplied URL (when `sourceKind === 'url'`), or
   - `data:<mimeType>;base64,<source>` (when `sourceKind === 'base64'`).
4. The model returns text; the agent normalizes it and wraps it as a
   single page result.

## Which Model

Any vision-capable chat model. In practice the app encourages the user
to pick one in Settings; the OCR path has no hard default
(`DEFAULT_OCR_MODEL_ID` is empty on purpose).

Commonly used:

- OpenAI `gpt-4o` or `gpt-4.1` (multimodal)
- Anthropic `claude-sonnet-4-6` or `claude-opus-4-6`

## Progress Reporting

The agent reports three progress checkpoints:

- `20%` — "Submitting OCR request"
- `100%` — "OCR complete"

A smoother progress bar would require token-level streaming; OCR uses a
non-stream call because the full response must be parsed as one result.

## Events

No streaming `text` events. The task handler reports lifecycle events
(`started`, `running`, `completed`) — enough for the UI to show a
spinner.

## Cancellation

`ctx.signal` is passed to the provider call via the OpenAI SDK's
`{ signal }` option. Cancellation aborts the outbound HTTP request.

## Failure Modes

| Failure | Behavior |
| --- | --- |
| Missing `source` / `apiKey` / `modelName` | Throws at `validate`; no API call. |
| Model returns no content | `text` is the empty string; caller decides what to do. |
| Provider rejects the image (too large / unsupported MIME) | The call throws; task ends in `error`. |

## Practical Notes

- **File size.** Providers typically cap image payloads at a few
  megabytes. For large scans, resize client-side before calling.
- **Tables and handwriting.** Vision-model OCR is uneven on tabular
  layouts and handwritten text; pick a flagship model for anything
  beyond clean printed text.
- **Multilingual docs.** The `language` hint is a hint — the model may
  still produce mixed-language output if the image itself is mixed.
- **Privacy.** The image payload is sent to the configured provider
  exactly like a chat message. No on-device OCR fallback is bundled.

## When You Want Something Else

Use the OCR agent when:

- You want a quick text extraction from a screenshot or scanned page.
- You want the extracted text to drop into a document or a chat turn.

Use the Transcription agent when the input is audio or video instead
of a still image. Use a custom pipeline (or a classical OCR library)
when you need offline processing, exact bounding boxes, or very large
multi-page batches.

## Future Work

- True multi-page output. Today the agent returns a single `pages[0]`
  entry. Splitting a long image or PDF into pages and running OCR per
  page is left to the caller.
- Optional post-processing skills (e.g. "clean up whitespace", "fix
  the obvious misreads") — a Skill-aware OCR agent is a plausible
  iteration.
