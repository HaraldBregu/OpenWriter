---
name: outline
description: Produce a structured outline from a topic or brief. Use when the user asks for a plan, structure, table of contents, chapter list, or scaffold before drafting prose.
metadata:
  openwriter:
    scope: bundled
    emoji: "🗂️"
    tags:
      - planning
      - structure
tools:
  - write
  - edit
---

## Outline Skill

Generate a hierarchical outline that matches the user's request.

### Rules

- Use Markdown headings (`#`, `##`, `###`) to express hierarchy — no bullet-only lists at top level.
- Each leaf should be concrete enough to draft later without further clarification.
- Do not draft the prose itself — only the scaffolding.
- End with a single-line "Next:" note suggesting which section to draft first.

### Output

- Write the outline to `content.md` using the `write` tool (replace) or `edit` tool (insert) depending on whether content already exists.
- Preserve any existing frontmatter or locked sections the user has specified.
