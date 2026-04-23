# Skills

A **skill** is a portable, self-contained workflow that an agent can
select and follow. Skills are plain Markdown files with YAML
frontmatter — authors can drop them in at runtime without touching app
code.

Source: `src/main/agents/skills/`.

## Inspiration

The format is modeled on Anthropic's
[Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) —
YAML frontmatter with `name` + `description`, followed by Markdown
instructions. OpenWriter keeps the core idea and trims the surface to
what the app's agents actually use.

## What A Skill Provides

- A **name** (unique identifier)
- A short **description** (what the controller reads when deciding
  whether to pick the skill)
- A body of **instructions** (loaded into the system prompt when the
  skill is chosen)
- Optional **metadata** (emoji, tags, required bins/env, homepage)
- Optional **tools list** (the tool names the skill expects to have
  available)
- Scope: `bundled`, `user`, or `plugin`

## File Shape

`<skillId>/SKILL.md`:

```markdown
---
name: blog-post-outline
description: Draft a five-section outline for a blog post from a topic.
metadata:
  openwriter:
    emoji: 📝
    tags: [writing, outline]
    requires:
      bins: []
      env: []
tools: []
---

# Blog Post Outline

Produce exactly five sections, each a Markdown H2 heading plus 2–3
bullet points:

1. **Hook** — a provocative question or vivid scene
2. **Context** — why the reader should care
3. **Argument** — the core claim, stated crisply
4. **Example** — one concrete case that proves the point
5. **Conclusion** — a single takeaway sentence

Do not write the full body prose. Outlines only.
```

Parser: `src/main/agents/skills/skill-parser.ts`. Built on
`gray-matter` — invalid frontmatter throws `SkillLoadError`; missing
required fields throw `SkillValidationError`.

## Required Fields

| Field | Required | Notes |
| --- | :-: | --- |
| `name` | yes | Unique per registry |
| `description` | yes | One line — this is what the controller reads |
| Body | yes | The markdown after the frontmatter (`---`) is the skill's instructions |

## Optional Fields

| Field | Notes |
| --- | --- |
| `metadata.openwriter.emoji` | Shown in UI |
| `metadata.openwriter.homepage` | Reference URL |
| `metadata.openwriter.skillKey` | Stable key distinct from `name` |
| `metadata.openwriter.primaryEnv` | Environment variable the skill needs |
| `metadata.openwriter.tags` | Array of tag strings |
| `metadata.openwriter.requires.bins` | Array of binaries the skill expects |
| `metadata.openwriter.requires.env` | Array of env vars the skill expects |
| `metadata.openwriter.scope` | Override — `bundled` / `user` / `plugin` |
| `tools` | Names of tools the skill expects to be registered |

`metadata.openclaw.*` is accepted as an alias for
`metadata.openwriter.*` for compatibility with the Anthropic-inspired
style.

## Optional Scripts And Assets

A skill folder can carry more than `SKILL.md`:

```
blog-post-outline/
├── SKILL.md
├── scripts/             # bash / python / node helpers the skill invokes
├── references/          # schemas, cheatsheets, lookup docs
└── assets/              # templates, icons, fixtures
```

Scripts are reached via the `bash` tool (when an agent has it
registered). A skill that declares `tools: [bash]` can ask an agent to
run one of its scripts as part of the workflow.

Today the ships agents don't bundle the `bash` tool by default — you
opt in by authoring a tool-capable agent or wiring it into an
extension. See [../extensions/CONTRIBUTIONS.md](../extensions/CONTRIBUTIONS.md)
for the tool story.

## The Registry And The Repository

Two classes work together:

- **`SkillRegistry`** (`src/main/agents/skills/skill-registry.ts`) —
  the in-memory name-to-skill map that agents query. Adding the same
  name twice throws.
- **`FileSystemSkillRepository`** (`skill-repository.ts`) — the
  persistent layer that reads/writes `<userData>/skills/<id>/SKILL.md`
  and supports `list`, `findById`, `importFromPath`, `delete`.

Three resolution scopes:

1. **Bundled** — skills shipped with the app.
2. **User** — skills the user installs at runtime.
3. **Plugin** — skills contributed by an extension (reserved).

`SkillsStoreService` (`src/main/services/skills-store-service.ts`)
orchestrates loading and is injected into `AgentTaskHandler` so the
writer agent gets a fresh catalog per run.

## Runtime Installation

Users install skills by importing a folder containing `SKILL.md`. The
repository:

1. Validates the folder has a `SKILL.md` (or child folders that do).
2. Parses each manifest.
3. Copies the folder into `<userData>/skills/<sanitized-name>/`.
4. Returns the new skill(s) to the UI.

The "Skill" page under Settings drives this flow.

## How Agents Use Skills

### Writer

The Writer's `ControllerNode` receives the whole catalog rendered as a
numbered list. The controller's contract:

- Pick `skill` **only** when a listed skill clearly matches the user's
  intent.
- Never invent a skill name.
- When none applies, pick `text` (plain generation) — this is
  explicitly better than picking a poorly-matched skill.

When the controller picks a skill, `TextNode` folds
`skill.instructions` into its system prompt:

```
You are the text worker for a writing agent.
...

Active skill: <skill.name>
<skill.instructions>
```

Emits `{ kind: 'skill:selected', payload: { skillName, instruction } }`.

### Painter (Planned)

Same mechanism applied to an image-oriented catalog:

```markdown
---
name: watercolor
description: Watercolor postcard style — loose strokes, faded palette.
---

When generating an image, prepend to the prompt:
- "Soft watercolor painting, loose strokes, faded palette..."
- Discourage photorealism.
```

The dedicated Painter agent isn't shipping yet (see
[PAINTER.md](./PAINTER.md)), but the skill format and selection
mechanism stay identical.

### Other Agents

OCR, Transcription, RAG, and Assistant don't consume skills today.
Skill support could be added — e.g. a "cleanup OCR output" skill that
post-processes transcripts — but there is no catalog wired into them.

## Selection Policy

The controller's policy is deliberately conservative:

- **Description is the selector.** Only the first-line description is
  read at selection time. Keep it specific.
- **Body is loaded on pick.** The longer markdown body is only added
  to the system prompt when the skill is chosen. Skills can be long
  without costing tokens on every call.
- **Never invented.** `AgentTaskHandler` verifies the picked skill
  name against the catalog; unknown names fall back to plain `text`.

## Authoring Guidelines

From the Anthropic skills guide + this codebase:

- Keep `SKILL.md` procedural and concise. Reference material goes in
  `references/`.
- Prefer specific over general. "Draft a five-section blog outline"
  beats "help with writing".
- Write in the imperative — the skill body becomes a system prompt
  directly.
- Declare required binaries / env in `metadata.openwriter.requires` so
  the UI can flag missing prerequisites before invocation.
- Keep the body focused on **what the model should produce**, not
  how the app should display it.

## Exposure Controls

```ts
interface SkillExposure {
  readonly includeInAvailableSkillsPrompt: boolean;
  readonly userInvocable: boolean;
  readonly disableModelInvocation: boolean;
}
```

- `includeInAvailableSkillsPrompt: false` — hide from the controller
  entirely.
- `userInvocable: true` — the user can trigger the skill directly
  from the UI (bypass the controller).
- `disableModelInvocation: true` — hard block: the controller can
  never pick it.

## Example Walkthrough

1. User drops `watercolor/` into the Skills page.
2. `FileSystemSkillRepository.importFromPath` validates + copies it.
3. The skill appears in `SkillRegistry`.
4. The user writes "Generate a painting of Punta Licosa at dusk".
5. Writer runs: IntentNode → ControllerNode receives the catalog and
   picks the `watercolor` skill.
6. TextNode bakes the skill body into its system prompt and streams
   text or issues a `generate_image` tool call with a
   watercolor-biased prompt.
7. Image is written to disk; Markdown reference is appended.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Skill never picked | Description is too generic or doesn't match the classified intent. |
| Skill picked incorrectly | Description overlaps with another entry; narrow one of them. |
| "Unknown skillName" warning | The catalog changed between runs — restart after installing. |
| Parse errors on import | Front matter is malformed, or `name` / `description` is missing. |
