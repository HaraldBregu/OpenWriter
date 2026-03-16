---
name: extractGraphOutput priority fix
description: Changed executor custom-state graph content resolution from "fullContent || extractedContent" to "extractedContent || fullContent" so extractGraphOutput is authoritative
type: project
---

On 2026-03-16, fixed `executeCustomStateGraphStream` in `src/main/ai/core/executor.ts` (line ~315).

**Before:** `const content = fullContent || extractedContent` -- streamed tokens took priority over extractGraphOutput.
**After:** `const content = extractedContent || fullContent` -- extractGraphOutput is authoritative.

**Why:** The image-generator agent has a `refine-prompt` node that streams tokens (the refined prompt text) and a `generate-image` node that produces the actual output (JSON with imageUrl). Under the old logic, `fullContent` (refined prompt tokens) was non-empty and would be returned as the task result, hiding the actual image generation output from `extractGraphOutput`.

**How to apply:** When building new multi-node agents where streamed content differs from the final output, `extractGraphOutput` now correctly takes precedence. Existing single-node agents (text-writer, text-enhance, text-completer) are unaffected because their extractGraphOutput returns the same content that was streamed.
