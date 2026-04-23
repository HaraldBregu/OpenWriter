# Skills And Tools

Two different extension points inside the agent loop:

- **Skills** — packaged workflows the controller can pick as the next
  action ("use the blog-post-outline skill here").
- **Tools** — deterministic capabilities the agent can **invoke**
  (read a file, generate an image) inside a single step.

Both expand what the agent can do without changing agent code.

## Skills

### What A Skill Is

A skill bundles:

- A **name** (unique identifier)
- A short **description** (what the controller reads when deciding)
- A body of **instructions** (loaded into the system prompt when the
  skill is picked)
- Scope: `bundled`, `user`, or `plugin`

Source contracts: `src/main/agents/skills/types.ts`.

### How Skills Are Authored

User skills live on disk under `userData/skills/<name>/SKILL.md`. Each
skill is a Markdown file with YAML front-matter, parsed by
`SkillParser`:

```markdown
---
name: blog-post-outline
description: Draft a 5-section outline for a blog post from a topic.
metadata:
  emoji: ✍️
  tags: [writing, outline]
exposure:
  includeInAvailableSkillsPrompt: true
  userInvocable: true
  disableModelInvocation: false
---

# Blog Post Outline

Produce five sections: hook, context, argument, example, conclusion.
Each section is a Markdown heading plus 2–3 bullet points.
```

The renderer has a **Skills page** in Settings to import, list, and
delete skills — calls into `SkillsStoreService`
(`src/main/services/skills-store-service.ts`).

### How The Agent Picks A Skill

When the Writer controller runs, it is shown the current skill catalog:

```text
Skill catalog (cross-reference each skill's description against the
classified intent and user request):
  1. blog-post-outline — Draft a 5-section outline for a blog post from a topic.
  2. tweet-thread — Break prose into a numbered Twitter thread.
  ...
```

The controller returns a structured decision:

```json
{ "action": "skill", "skillName": "blog-post-outline", "instruction": "..." }
```

If the skill name does not exist in the catalog, the handler falls back
to `action: "text"` and logs a warning — skills cannot be hallucinated.

### When The Agent Is Told _Not_ To Pick A Skill

Skills have an **exposure** block:

- `includeInAvailableSkillsPrompt` — if `false`, hidden from the
  controller entirely
- `userInvocable` — if `true`, the user can trigger the skill directly
  from the UI (bypassing the controller)
- `disableModelInvocation` — hard block: model may never pick it

### Registry

All skills go through a single `SkillRegistry`
(`src/main/agents/skills/skill-registry.ts`). Name collisions throw;
the registry is the single source of truth for prompts and lookups.

## Tools

### What A Tool Is

A tool is a typed, executable capability with:

- A **name** (unique, used in function-calling schemas)
- A **description**
- A JSON Schema for **parameters** (shaped to match the OpenAI
  `tools[].function.parameters` field)
- An `execute(callId, input, signal, onUpdate?)` function returning a
  structured `ToolResult`

Source: `src/main/agents/tools/types.ts`.

### Built-In Tools

Located in `src/main/agents/tools/`:

| Tool | What it does |
| --- | --- |
| `read` | Read a file inside the workspace |
| `write` | Write/replace a file |
| `edit` | Apply targeted edits (unified-diff style) |
| `bash` | Run a shell command (restricted) |
| `grep` | Search file contents |
| `find` | Find files by name |
| `ls` | List a directory |
| `generate_image` | Generate an image and insert it into `content.md` |

The bundles exported from `tools/index.ts`:

- `codingTools` — read, bash, edit, write (for agents that manipulate code)
- `readOnlyTools` — read, grep, find, ls (for safe inspection)

### `generate_image` — The Star Tool For Writers

Defined in `src/main/agents/tools/generate-image.ts`.

Parameters:
- `prompt` (required) — text description of the image
- `filename` (optional) — base filename without extension
- `size` — `"1024x1024"`, `"1024x1536"`, `"1536x1024"`, or `"auto"`

Side effects:
1. Calls the configured image provider (`providerId` + `apiKey` +
   `modelName`) and gets back base64 PNG data.
2. Writes the image to `<workspaceRoot>/images/<filename>.png`.
3. Appends a Markdown image reference
   `![alt](<relative-to-content.md path>)` into the document's
   `content.md` through a mutation-queue so concurrent writes don't
   corrupt the file.

The tool returns a text content block describing what it did, and
`details` with the absolute path, relative path, and filename.

See [IMAGE_GENERATION.md](./IMAGE_GENERATION.md) for the full flow.

### Path Safety

Tool execution is bounded by a `cwd` passed when creating the tool set
(`createAllTools(cwd)`, `createCodingTools(cwd)`, …). Tools resolve
inputs relative to this root and refuse to escape it:

- `resolveToCwd` validates paths stay under `cwd`
- `file-mutation-queue.ts` serializes writes to the same file so
  concurrent tool calls don't interleave writes

This keeps tool calls from touching arbitrary parts of the user's
filesystem.

### OpenAI Adapter

`openai-adapter.ts` converts an array of `AgentTool` objects into the
shape OpenAI's Chat Completions API expects:

- `toOpenAITools(tools)` — map to `{ type: 'function', function: { name, description, parameters } }`
- `executeToolCalls(tools, toolCalls, signal)` — run the parsed tool
  calls, respecting each tool's `executionMode: 'parallel' | 'sequential'`

## Skills vs Tools — When To Use Which

| Question | Answer |
| --- | --- |
| _Does it have a deterministic side effect (I/O, file write)?_ | Tool |
| _Does it shape **how** the model writes text?_ | Skill |
| _Can the user author it without code?_ | Skill |
| _Does it need a typed input schema the model fills in?_ | Tool |

A skill tells the agent _what_ to do; a tool gives the agent _power_ to
do it.

## Where It All Comes Together

In a single Writer run:

1. `IntentNode` classifies the user's request.
2. `ControllerNode` sees the skill catalog and picks:
   - `action: "text"` with a composed instruction, **or**
   - `action: "skill"` naming a catalog entry
3. `TextNode` streams text. If the underlying chat model supports
   function-calling and a tool like `generate_image` is registered,
   the model may call it mid-stream; the tool produces an image and
   appends the Markdown reference to `content.md`.
4. The loop repeats until `done` or `maxSteps`.
