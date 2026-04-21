---
name: illustrate
description: Plan and request an illustration for a section of the document. Use when the user asks for imagery, diagrams, or a visual break between prose — the controller will dispatch the "image" action after this skill produces a prompt.
metadata:
  openwriter:
    scope: bundled
    emoji: "🎨"
    tags:
      - image
      - visual
tools:
  - read
---

## Illustrate Skill

Produce a vivid, self-contained image prompt that the image node can execute.

### Rules

- Read the nearby text so the image matches tone, era, and subject.
- Describe subject, setting, mood, composition, and lighting — one paragraph.
- Do not embed text or logos in the image unless the user asked.
- Avoid copyrighted characters, real people, or brand marks.
- Cap prompt length at ~350 characters.

### Output

- Return the prompt string as your final message. The controller will run the `image` node with it; do not try to generate the image yourself.
