# Painter Agent

The **Painter** is the image-producing agent in OpenWriter. Given a
writing context and a prompt, it produces an image file on disk and an
inline Markdown reference the editor renders.

## Current State

Today the painter capability ships as a **tool**, not a standalone
agent:

- The `generate_image` tool in `src/main/agents/tools/generate-image.ts`
  does all the painter work.
- The Writer (and any other tool-capable agent) can call it during a
  run.
- A dedicated `PainterAgent` class is **not** registered yet — it is
  the natural next refactor.

This doc describes both — the functional behavior (stable) and the
planned dedicated agent shape (forward-compatible).

## What The Painter Does

1. Take a prompt describing the image.
2. Optionally use surrounding document context (selection, nearby
   paragraphs) to ground the image concept.
3. Call the configured image provider.
4. Save the PNG to `<workspace>/images/<filename>.png`.
5. Append `![alt](<relative-path>)` into the document's `content.md`
   at the right place.
6. Return metadata the caller can reference.

## Input (Current Tool Shape)

```ts
interface GenerateImageToolInput {
  prompt: string;
  filename?: string;                // sanitized; defaulted to a UUID
  size?: '1024x1024' | '1024x1536' | '1536x1024' | 'auto';
}

interface GenerateImageToolDeps {
  imagesRoot: string;         // workspace images folder
  providerId: string;
  apiKey: string;
  modelName: string;          // e.g. 'gpt-image-1'
  contentFilePath: string;    // absolute path to content.md
}
```

## Output

```ts
interface GenerateImageToolDetails {
  absolutePath: string;       // where the PNG was written
  relativePath: string;       // relative to content.md
  filename: string;
}
```

The tool also returns a human-readable text block so the model's
conversation state knows what happened.

## Side Effects

- Image is written via `fs.writeFile`.
- `content.md` update is serialized through
  `withFileMutationQueue(contentFilePath, …)` so concurrent writes
  (text stream + image append) cannot interleave.
- Alt text is derived from the prompt — trimmed, whitespace-collapsed,
  truncated to ~80 chars.

## Default Model

The default image model is `gpt-image-1` (OpenAI). The Painter uses
whatever the agent's `models.image` setting resolves to. Per-call
overrides are possible from callers that know a specific model id.

## How The Writer Invokes It Today

Inside a Writer run, the chat model is given the `generate_image` tool
through the OpenAI function-calling surface. When the model decides a
tool call is appropriate:

1. The controller marks the phase as _Generating image_.
2. `executeToolCalls` runs the tool with the supplied arguments.
3. The tool writes the image and appends the Markdown reference.
4. The tool result is returned to the chat model, which then continues
   writing prose around the newly inserted image.

This "tool-calling mid-write" is what makes prose + image production
feel like a single flow from the user's point of view.

## Planned: Dedicated `PainterAgent`

The planned shape (not yet shipping):

### Input

```ts
interface PainterAgentInput {
  prompt: string;
  style?: string;             // free-form; folded into the system prompt
  size?: '1024x1024' | '1024x1536' | '1536x1024' | 'auto';
  filename?: string;
  // provider/model resolved from Settings like every other agent
  providerId: string;
  apiKey: string;
  modelName: string;
  // optional grounding context
  context?: {
    documentId?: string;
    markdown?: string;        // the nearby paragraph(s) to ground on
    ragSnippets?: string[];   // retrieved chunks to anchor the image
  };
  skills?: Skill[];           // painter-applicable skills (style sheets)
}
```

### Output

```ts
interface PainterAgentOutput {
  absolutePath: string;
  relativePath: string;
  filename: string;
  prompt: string;             // final, post-skill prompt used
  stoppedReason: 'done' | 'error';
}
```

### Why Split It Out

- **Reuse without the Writer.** Extensions and flows that want only an
  image shouldn't have to run the full Writer loop.
- **Style skills.** Skills like `vintage-postcard` or `watercolor`
  become first-class inputs the Painter consumes, just like the Writer
  consumes skills.
- **Grounded prompts.** The Painter can take a retrieval context in
  its own input shape rather than being handed it through tool
  arguments.
- **Testability.** The Painter becomes a single unit to test with
  deterministic provider mocks.

### Migration Path

Because `generate_image` already owns the side effects, extracting a
`PainterAgent` is additive:

1. Register `new PainterAgent()` in the agent registry.
2. Internally, `PainterAgent.execute` calls the same
   `createGenerateImageTool(...)` factory.
3. Leave the tool registration on the Writer as-is so callers that
   want the "write + image" combined flow don't change.

## How Users Control It

From the editor:

- **Implicit.** "Write a scene about a red lighthouse at sunset and
  add a painterly illustration." → Writer picks up the prompt and the
  tool-call runs mid-stream.
- **Explicit.** "Generate an image of a vintage airship over clouds."
  → same mechanism; the model emits a tool call first and no prose.

Through extensions: submit an agent task with
`input.agentType = 'painter'` (once the dedicated agent ships) or with
`input.agentType = 'writer'` and a prompt that will trigger the image
tool.

## Skills And The Painter

Paint-oriented skills are plain `SKILL.md` files whose body is a
painting style sheet:

```markdown
---
name: watercolor
description: Watercolor postcard style — loose strokes, faded palette.
---

# Watercolor Style

When generating an image, prepend to the user prompt:

- "Soft watercolor painting, loose strokes, faded palette..."
- Discourage photorealism.
- Prefer warm whites and blue-grey shadows.
```

When the Painter selects that skill, its instructions are folded into
the model's system prompt. Style consistency across images becomes a
matter of authoring the right skill, not tweaking prompts.

See [SKILLS.md](./SKILLS.md) for the skill format.

## RAG Augmentation

A grounded Painter uses RAG snippets as additional concept anchors.
Example grounding prompt:

```
System: You produce image prompts. Draw only from the provided
context when selecting subjects, props, or setting.

Context:
[1] "The lighthouse at Punta Licosa was built in 1912 ..."
[2] "The foghorn tower has two rings ..."

User prompt: Generate an image of the lighthouse at sunset.
```

See [RAG_AUGMENTATION.md](./RAG_AUGMENTATION.md).

## Known Limits

- One image model configured at a time (per agent).
- No inpainting / editing / variant generation — the tool only creates
  new images.
- No built-in cropping (the app ships `react-image-crop` but it isn't
  wired into the generation path).
- No batch generation in a single call — one image per invocation.
- The dedicated `PainterAgent` is not shipping yet; callers use
  the Writer + tool path.
