# Image Generation

OpenWriter can generate images and insert them into the document the user
is writing, in the same run as the text. This is one of the defining
features of the product: writing and image production share a single
agent loop.

## User-Facing Behavior

From the user's point of view:

1. The user writes a prompt inline, e.g. _"Draft an intro paragraph about
   the history of airships and generate a vintage-style hero image."_
2. The Writer agent starts. The task status bar shows _Thinking_.
3. Tokens start streaming into the editor — the intro paragraph is
   being written.
4. The status bar switches to _Generating image_ when the agent decides
   to call the `generate_image` tool.
5. The image is saved under `<workspace>/images/<filename>.png`. A
   Markdown image reference (`![alt](../images/<filename>.png)`) is
   appended to the document at the right place.
6. The editor re-renders — the image appears inline.
7. The status bar returns to _Writing_ if more text follows, or
   _Done_ when the loop ends.

No extra prompt, no popup, no confirmation dialog. The model decides
when to call the tool based on the instruction.

## Triggering Image Generation

The user can guide generation with three kinds of prompts:

- **Implicit** — describe what you want written, and mention an image
  naturally. _"Write a scene and add a painting-style illustration."_
- **Explicit** — tell the agent to produce an image. _"Generate an image
  of a red lighthouse at sunset."_
- **Preset action** — an "Insert Image" action that wraps a canned prompt.

For all three, the underlying mechanism is the same: the Writer's
controller step or the TextNode's function-calling layer selects the
`generate_image` tool.

## The Tool

`src/main/agents/tools/generate-image.ts`.

### Parameters

```json
{
  "prompt": "vintage-style painting of an airship over clouds at dawn",
  "filename": "airship-hero",
  "size": "1536x1024"
}
```

- `prompt` (required)
- `filename` (optional; sanitized and defaulted to a UUID)
- `size` (one of `1024x1024`, `1024x1536`, `1536x1024`, `auto`)

### Side Effects

1. **API call** — the tool uses the provider/model injected at
   construction time (typically OpenAI + `gpt-image-1`) to generate a
   base64 PNG.
2. **Save to disk** — writes `<imagesRoot>/<filename>.png`, where
   `imagesRoot` is the workspace's top-level `images/` folder.
3. **Append to `content.md`** — computes the relative path from the
   document's `content.md` to the new image and appends:

   ```markdown
   ![<alt>](<relative-path>)
   ```

   The write goes through `withFileMutationQueue(contentFilePath, ...)`
   so concurrent writes from other tools or the text stream cannot
   interleave and corrupt the file.

### Alt Text

The tool derives `alt` from the prompt — trimmed, whitespace-collapsed,
and truncated to ~80 chars. Good enough as a default; the user can
edit it later.

### Return Value

```json
{
  "content": [
    { "type": "text", "text": "Saved image to /.../airship-hero.png and appended to content.md the markdown reference: ![airship ...](../images/airship-hero.png)" }
  ],
  "details": {
    "absolutePath": "/.../images/airship-hero.png",
    "relativePath": "../images/airship-hero.png",
    "filename": "airship-hero.png"
  }
}
```

The return text ends up in the model's tool-call context so the model
knows the image was saved and can continue writing naturally.

## Path Resolution

Image paths are anchored relative to the document's `content.md`:

```text
workspace/
├── documents/
│   └── <docId>/
│       ├── content.md
│       └── images/            ← NOT where generated images go
└── images/                     ← generated images go HERE
    └── airship-hero.png
```

Generated images land in the **workspace-wide** `images/` folder (so
multiple documents can share them), and the Markdown reference uses a
relative path (`../images/airship-hero.png`) that works both in the
editor and when the file is rendered by any other Markdown tool.

## Why Not Just Embed The Base64?

Embedding base64 data URIs in Markdown works but:

- Bloats the file
- Breaks diffs and version control
- Makes the image invisible to non-markdown readers (Finder preview,
  other editors)

Saving to disk keeps the document portable and the file human-readable.

## Concurrency And Safety

- `withFileMutationQueue(contentFilePath, …)` serializes all writes to
  `content.md`. The user's text stream and the image-append cannot
  clobber each other.
- The tool validates `imagesRoot` at creation time; filenames are
  sanitized to a safe subset (`[a-zA-Z0-9._-]`).
- Aborted tasks: if the agent is cancelled after the API call but
  before the file is written, the partial write is skipped and an
  abort error is thrown.

## Who Pays For It

Image generation is billed to the user's provider account for the
configured image model. OpenWriter has no server — there is no markup
and no proxy.

## Failure Modes

| Failure | User experience |
| --- | --- |
| Provider returns no image data | Tool throws; task errors; stream reverts |
| Disk write fails | Tool throws; task errors |
| Workspace folder deleted mid-generation | Write fails; task errors |
| Cancellation mid-generation | Task marked `cancelled`; no partial PNG persists |

## Current Limits

- Only one image model is configured at a time per agent (default
  `gpt-image-1`). Alternative image models can be wired by extending
  the agent config and the tool factory.
- No variant / edit mode — the tool only generates new images.
- No inpainting or region editing.
- No built-in cropping UI. Images can be cropped after the fact
  because `react-image-crop` ships with the app, but the generation
  path doesn't use it.
