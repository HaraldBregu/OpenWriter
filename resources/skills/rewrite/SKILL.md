---
name: rewrite
description: Rewrite a passage in a requested tone, voice, or register (formal, casual, academic, marketing, plain-English, etc.) without changing the underlying meaning. Use when the user asks to "make this sound X" or "rephrase".
metadata:
  openwriter:
    scope: bundled
    emoji: "✍️"
    tags:
      - editing
      - style
tools:
  - read
  - edit
---

## Rewrite Skill

Rewrite the target passage to match the requested style while preserving meaning.

### Rules

- Preserve all factual claims, numbers, citations, and technical terms exactly.
- Keep the same semantic structure — do not merge, split, or reorder paragraphs unless asked.
- Do not invent new content. If a claim is ambiguous, keep the original phrasing.
- Match register: formal = no contractions; casual = contractions ok, short sentences; academic = hedged, cited; marketing = active voice, benefit-led.

### Workflow

1. Use `read` to load the current passage from `content.md`.
2. Replace only the targeted range using the `edit` tool — never rewrite the whole file unless the instruction says so.
3. Report a one-line summary of the stylistic changes applied.
