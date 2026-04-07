---
name: image_generator agent architecture decisions
description: Key non-obvious design choices made when implementing the image_generator agent — custom executor pattern, OpenAI SDK vs fetch, plain state vs LangGraph
type: project
---

The image_generator agent uses the `execute` custom hook on `AgentDefinition` rather than a LangGraph `buildGraph`. This means there is no `StateGraph`, no `Annotation.Root()`, and no graph compilation — the state is a plain immutable TypeScript interface (`ImageGeneratorState`) mutated via an `applyPatch` helper.

**Why:** Task required no LangGraph orchestration — plain async/await loop was requested explicitly. However, LLM specialist nodes still use `ChatOpenAI` from `@langchain/openai` because `AgentTaskHandler` and `executeAIAgentsStream` require `NodeModelMap` (Record<string, BaseChatModel>), so the existing executor machinery expects LangChain models.

**How to apply:** When adding further "no-framework" agents, use the same `execute` hook pattern with a plain state interface and `applyPatch`. Do not declare `buildGraph` or `buildGraphInput`. Only declare `defaultModel` (not `nodeModels`) since node models are constructed inline inside `execute`.

The actual image generation call uses `openai` SDK v4+ (`client.images.generate()`) with model `gpt-image-1`, NOT `fetch()`. Painter uses `fetch()` — image_generator diverges here intentionally.

The revision loop inside `execute` is bounded by `state.maxRevisions` (default 2). After `checkAlignment`, if `alignmentApproved` is false and `revisionCount < maxRevisions`, the loop re-runs from `createImagePrompt` (step 2), not from `interpretIntent` (step 1) — same routing logic as Painter's graph.
