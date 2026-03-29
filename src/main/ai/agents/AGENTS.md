# AI Agents Folder Guide

## Purpose

`src/main/ai/agents` contains the concrete, product-level AI agents used by the main process for agentic inference.

This folder is responsible for:

- Defining each user-facing agent, such as text writing, text enhancement, text completion, image generation, and research.
- Declaring per-agent model configuration, graph topology, and graph input/output mapping.
- Holding domain prompts, node implementations, graph state definitions, and agent-specific helpers.
- Providing the concrete agent definitions that are registered into the global `AgentRegistry` during bootstrap.

This folder is not the entire AI subsystem by itself.

Adjacent folders complete the full architecture:

- `src/main/ai/core`: generic execution infrastructure, shared types, registry, and streaming executor.
- `src/main/ai/indexing`: document extraction, chunking, and vector-store persistence for RAG-style indexing.
- `src/main/task/handlers`: task entrypoints that invoke agents or indexing pipelines.
- `src/main/shared`: model factories, provider resolution, embeddings setup, and shared AI utilities.

In short:

- `agents/` = what each agent does.
- `core/` = how agents are executed.
- `indexing/` = how workspace resources are prepared for retrieval workflows.

## Current Folder Structure

```text
src/main/ai/agents/
  AGENTS.md
  index.ts
  image_generator/
    REFINE_PROMPT_SYSTEM.md
    definition.ts
    generate-image-node.ts
    graph.ts
    refine-prompt-node.ts
    state.ts
  researcher/
    definition.ts
    graph.ts
    messages.ts
    researcher-service.ts
    state.ts
    nodes/
      compose-node.ts
      evaluate-node.ts
      plan-node.ts
      research-node.ts
      understand-node.ts
  text_completer/
    WRITE_SYSTEM.md
    definition.ts
    graph.ts
    state.ts
    write-node.ts
  text_enhance/
    ENHANCE_SYSTEM.md
    definition.ts
    enhance-node.ts
    graph.ts
    state.ts
  text_writer/
    WRITE_SYSTEM.md
    definition.ts
    graph.ts
    state.ts
    write-node.ts
```

## What Each File Type Means

### `index.ts`

This is the barrel for concrete agent exports.

It currently exports:

- `TextCompleterAgent`
- `TextEnhanceAgent`
- `TextWriterAgent`
- `ImageGeneratorAgent`
- `ResearcherAgent`

These definitions are imported by `src/main/bootstrap.ts` and registered into `AgentRegistry`.

### `definition.ts`

This is the canonical contract for an agent.

Each `definition.ts` typically declares:

- `id`: machine-readable task/registry identity.
- `name`: renderer-facing display name.
- `category`: grouping used by the UI.
- `defaultModel` or `nodeModels`: model selection policy.
- `buildGraph`: LangGraph graph factory.
- `buildGraphInput`: mapping from executor context to graph state.
- `extractGraphOutput`: how to turn final graph state into response text.
- `extractStateMessage`: optional progress/thinking text extraction.
- `streamableNodes`: which nodes are allowed to stream tokens to the UI.

This file should stay declarative.
Avoid embedding business logic here beyond graph wiring and state mapping.

### `graph.ts`

This defines the LangGraph topology for the agent.

Typical responsibilities:

- Create a `StateGraph(...)`.
- Add nodes in execution order.
- Connect `START` and `END`.
- Inject the already-resolved model or per-node model map.
- Return `graph.compile()`.

Important convention:

- Nodes should receive models via graph injection.
- Nodes should not construct model clients ad hoc.

### `state.ts`

This defines the graph state annotation and the shape of the agent's working memory.

Typical contents:

- Input prompt.
- Intermediate reasoning fields.
- Final output field.
- Optional state/progress message field.
- Provider/model metadata when required by nodes.

This is the source of truth for graph state shape.

### `*-node.ts` or `nodes/*.ts`

These are the operational steps of the agent.

Typical responsibilities:

- Build prompt messages.
- Call the injected LangChain model.
- Parse or normalize the result.
- Return partial state updates for the graph.

Rules:

- Keep node logic pure relative to graph state when possible.
- Avoid filesystem, IPC, or container lookups inside nodes unless there is a strong reason.
- Prefer deterministic state updates.

### `*_SYSTEM.md`

Prompt files hold system instructions for agents that need authored behavior contracts.

Examples:

- `WRITE_SYSTEM.md`
- `ENHANCE_SYSTEM.md`
- `REFINE_PROMPT_SYSTEM.md`

Treat these as product behavior surfaces.
Changes to these files can materially change output quality and should be tested accordingly.

### `researcher-service.ts`

`researcher-service.ts` is a specialized service used by the researcher flow.

It is different from the declarative `definition.ts` files because it coordinates:

- provider resolution,
- per-node model creation,
- graph execution support,
- state/progress messaging,
- streamed response handling.

Use this pattern only when an agent needs a service-level orchestration layer beyond the shared executor path.

## Current Agent Inventory

### `text_writer`

Purpose:

- Generate new content from a prompt.

Shape:

- Single-node LangGraph.
- Custom-state protocol.
- Streams only the `write` node.

Key files:

- `definition.ts`
- `graph.ts`
- `state.ts`
- `write-node.ts`
- `WRITE_SYSTEM.md`

### `text_completer`

Purpose:

- Continue text from surrounding document context.

Shape:

- Single-node LangGraph.
- Custom-state protocol.
- Prompt tuned for inline continuation.

### `text_enhance`

Purpose:

- Rewrite or improve selected text.

Shape:

- Single-node LangGraph.
- Custom-state protocol.
- Usually used for replacement/editing tasks instead of greenfield writing.

### `image_generator`

Purpose:

- Refine an image prompt and then generate an image.

Shape:

- Multi-step graph.
- Uses authored prompt-refinement instructions.
- Includes a generation node that uses the `openai` SDK directly for image output.

### `researcher`

Purpose:

- Multi-step analysis agent for understanding a prompt, selecting a response strategy, planning research angles, synthesizing findings, and composing a final answer.

Shape:

- Multi-node LangGraph pipeline.
- Per-node model configs.
- Only the final compose step streams tokens to the UI.
- Uses `extractStateMessage` to surface progress text to the renderer.

Pipeline:

```text
START
  -> understand
  -> evaluate
  -> plan_step
  -> research_step
  -> compose
  -> END
```

## How Inference Works End to End

### Registration

Bootstrap registers concrete definitions in `src/main/bootstrap.ts`.

Today that includes:

- `TextCompleterAgent`
- `TextEnhanceAgent`
- `TextWriterAgent`
- `ImageGeneratorAgent`
- `ResearcherAgent`

### Task Entry

Inference enters through `src/main/task/handlers/agent-task-handler.ts`.

That handler:

- resolves the agent definition from `AgentRegistry`,
- resolves provider credentials through `ProviderResolver`,
- builds either one model or a per-node model map,
- invokes `executeAIAgentsStream(...)`,
- forwards streamed events back to the task/event bus.

### Execution Modes

The shared executor in `src/main/ai/core/executor.ts` supports three runtime paths:

1. Plain chat completion
2. LangGraph messages protocol
3. LangGraph custom-state protocol

This folder mostly uses the custom-state LangGraph path.

That means:

- `buildGraphInput` creates a domain-specific initial state.
- The graph runs with streaming.
- `extractGraphOutput` converts final state into the user-facing text result.

### Model Resolution

Models are not hardcoded at execution time inside most nodes.

The normal path is:

1. resolve provider config via `ProviderResolver`
2. create chat models via `createChatModel(...)`
3. inject those models into the graph
4. let nodes consume the injected models

This keeps provider configuration centralized and testable.

## RAG and Indexing Relationship

This folder is for inference agents.
RAG indexing currently lives in the sibling folder `src/main/ai/indexing`, not inside `agents/`.

That indexing subsystem provides:

- extractor selection via `ExtractorRegistry`
- file-type extraction for plain text, PDF, and DOCX
- chunking via `chunkText(...)`
- vector persistence via `JsonVectorStore`
- manifest/storage helpers such as `IndexingManifest`

The indexing task entrypoint is:

- `src/main/task/handlers/indexing-task-handler.ts`

The current indexing pipeline is:

```text
workspace resources
  -> document load
  -> extractor resolution by extension
  -> text extraction
  -> chunking
  -> embedding generation
  -> JSON vector store save
  -> indexing metadata write
```

Today, indexing is implemented as a batch task and inference agents are implemented separately.
There is not yet a fully integrated retrieval-aware agent in this folder that reads the vector store during generation.

If a new RAG-enabled agent is added, it should typically:

- live in a new subfolder under `src/main/ai/agents/`,
- use `src/main/ai/indexing` outputs as its retrieval layer,
- keep retrieval orchestration outside low-level node prompt files,
- avoid mixing extraction/indexing code directly into the agent folder.

## Runtime Dependencies Used Here

The agent and indexing stack currently relies on these packages:

### Core inference and graph orchestration

- `@langchain/core`
  Used for messages, documents, embeddings interfaces, and chat model types.

- `@langchain/langgraph`
  Used to define and compile agent state graphs.

- `@langchain/openai`
  Used by both chat and embeddings factories.

- `langchain`
  Present in the project as part of the broader LangChain stack.

### Prompting and chunking

- `@langchain/textsplitters`
  Used by the indexing text chunker.

### Provider-specific SDK

- `openai`
  Used directly by image generation for image output workflows.

### Document ingestion

- `pdf-parse`
  Used for PDF extraction.

- `mammoth`
  Used for DOCX extraction.

### Internal factories and helpers

- `src/main/shared/chat-model-factory.ts`
  Creates `ChatOpenAI` clients against OpenAI-compatible endpoints.

- `src/main/shared/embedding-factory.ts`
  Creates `OpenAIEmbeddings` clients for indexing.

- `src/main/shared/provider-resolver.ts`
  Resolves provider identity and API keys from configured provider state.

## Recommended Conventions For New Agents

When adding a new agent folder under `src/main/ai/agents`, prefer this structure:

```text
my_agent/
  definition.ts
  graph.ts
  state.ts
  nodes/
    first-node.ts
    second-node.ts
  MY_SYSTEM.md
```

Use a single-node layout only when the workflow is genuinely simple.

Recommended rules:

- Keep `definition.ts` declarative.
- Keep graph topology in `graph.ts`.
- Keep state contracts in `state.ts`.
- Keep prompt-heavy instructions in `.md` files.
- Keep low-level prompt execution in node files.
- Inject models from the executor/graph layer instead of constructing them in nodes.
- Use `streamableNodes` to suppress internal planner/classifier tokens.
- Use `extractStateMessage` when the UI should show graph progress.
- Prefer explicit typed state fields over passing opaque JSON blobs through the graph.

## Recommended Conventions For RAG-Aware Agents

If this folder starts hosting retrieval-augmented agents, keep the layering explicit:

- Retrieval/query orchestration belongs in the agent graph or a dedicated support service.
- Index construction stays in `src/main/ai/indexing`.
- Extractors stay file-type-specific and reusable.
- Vector-store format changes should be isolated to the indexing subsystem.
- Retrieval inputs should be explicit state fields such as query, retrievedChunks, and citations.

Suggested RAG-capable agent layout:

```text
rag_agent/
  definition.ts
  graph.ts
  state.ts
  retrieval-service.ts
  nodes/
    rewrite-query-node.ts
    retrieve-node.ts
    synthesize-node.ts
    answer-node.ts
  ANSWER_SYSTEM.md
```

## Important Architectural Boundaries

### Keep this folder product-focused

This folder should describe agent behavior, not become a second generic framework layer.

### Keep registry and task wiring out of here

Registration belongs in:

- `src/main/bootstrap.ts`

Task entry belongs in:

- `src/main/task/handlers/agent-task-handler.ts`
- `src/main/task/handlers/indexing-task-handler.ts`

### Keep provider resolution centralized

Do not scatter API-key resolution across nodes.
Use:

- `ProviderResolver`
- `createChatModel(...)`
- `createEmbeddingModel(...)`

### Keep prompt files under version control review

Prompt changes can cause behavior regressions just as code changes do.
Treat prompt updates as functional changes, not editorial noise.

## Practical Extension Checklist

When adding a new inference agent:

1. Create a new subfolder under `src/main/ai/agents`.
2. Add `state.ts`, `graph.ts`, `definition.ts`, and node files.
3. Export the definition from `src/main/ai/agents/index.ts`.
4. Register it in `src/main/bootstrap.ts`.
5. Ensure `AgentTaskHandler` can resolve its model configuration.
6. Add tests for graph output and task execution behavior.

When adding new indexing capability:

1. Add extractor or indexing support under `src/main/ai/indexing`.
2. Register new extractors in `src/main/bootstrap.ts`.
3. Keep indexing task orchestration in `indexing-task-handler.ts`.
4. Only connect agents to retrieval after the storage/query contract is clear.

## Summary

`src/main/ai/agents` is the concrete agent behavior layer for OpenWriter.
It defines what each agent is, how each graph is shaped, which nodes stream, and how outputs are extracted.

It works together with:

- `core/` for execution and streaming,
- `indexing/` for RAG-style document preparation,
- task handlers for runtime entry,
- provider/model factories for actual LLM and embedding clients.

If this area grows, keep the boundaries sharp:

- concrete agent logic in `agents/`
- reusable execution infrastructure in `core/`
- retrieval/indexing infrastructure in `indexing/`
