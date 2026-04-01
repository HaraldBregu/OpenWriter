# AI Subsystem Guide

## Purpose

`src/main/ai` is the main-process AI subsystem for OpenWriter.

This folder owns three related concerns:

- agentic inference for writing, editing, analysis, and image-generation workflows
- shared execution infrastructure for streaming models and LangGraph state graphs
- indexing primitives for retrieval-oriented workflows such as document extraction, chunking, and vector storage

This folder is where the AI architecture is defined.
It is not the renderer UI, and it is not the task queue itself.
The task system invokes this subsystem, and the renderer consumes its streamed results through IPC.

## Current Structure

```text
src/main/ai/
  AGENTS.md
  index.ts
  agents/
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
  core/
    agent-registry.ts
    definition.ts
    executor.ts
    index.ts
    types.ts
  rag/
    extractor-registry.ts
    index.ts
    rag-manifest.ts
    text-chunker.ts
    vector-store.ts
    extractors/
      document-extractor.ts
      docx-extractor.ts
      pdf-extractor.ts
      plain-text-extractor.ts
```

## Top-Level Responsibilities

### `agents/`

This folder contains concrete product agents.

Each agent folder usually defines:

- its identity and metadata
- graph topology
- graph state
- node implementations
- prompt assets

Use `agents/` for product behavior, not for generic execution framework code.

### `core/`

This folder contains reusable execution infrastructure shared by all agents.

It defines:

- `AgentDefinition`, the contract each agent must satisfy
- `AgentRegistry`, the runtime registry of all registered agent definitions
- executor input and stream event types
- `executeAIAgentsStream(...)`, the streaming runtime that actually runs plain-chat and LangGraph-based agents

This folder is the abstraction layer between task handlers and concrete agents.

### `rag/`

This folder contains the document indexing pipeline primitives used for retrieval-oriented flows.

It provides:

- extractor interfaces
- file-type-specific text extraction
- chunking
- a JSON-based vector store
- indexing manifest helpers

This is the storage and preprocessing layer for RAG-style use cases.

## Barrel Entry

`src/main/ai/index.ts` is the subsystem barrel.

It re-exports:

- core registry and executor types/functions
- concrete agents from `agents/`
- extractors, chunking, manifest, and vector store from `rag/`

This is the primary import surface for the rest of the main process.

## Concrete Agent Layer

The current registered agents are:

- `text-writer`
- `text-completer`
- `text-enhance`
- `image-generator`
- `researcher`

These are exported from `src/main/ai/agents/index.ts` and registered in `src/main/bootstrap.ts`.

### Common Agent File Contract

A typical agent folder contains:

- `definition.ts`
  Declares agent metadata, model configuration, graph factory, and state input/output mapping.

- `graph.ts`
  Defines the LangGraph topology and node order.

- `state.ts`
  Declares the graph state shape.

- `write-node.ts`, `enhance-node.ts`, or `nodes/*.ts`
  Implements the actual work done inside each graph step.

- `*_SYSTEM.md`
  Stores authored system prompts or prompt fragments that define behavior.

### What `definition.ts` Should Contain

`definition.ts` is the canonical definition of an agent.

Typical fields:

- `id`
- `name`
- `category`
- `defaultModel` or `nodeModels`
- `buildGraph`
- `buildGraphInput`
- `extractGraphOutput`
- `extractStateMessage`
- `streamableNodes`

Keep this file declarative.
Do not turn it into a service or execution script.

### What `graph.ts` Should Contain

`graph.ts` should:

- instantiate `StateGraph(...)`
- add nodes
- add edges from `START` to `END`
- inject already-resolved models into nodes
- compile and return the graph

Important rule:

- nodes should receive models from the graph layer
- nodes should not create model instances ad hoc unless there is a special-case reason

### What `state.ts` Should Contain

`state.ts` should define the graph's working memory.

That usually includes:

- the prompt
- intermediate reasoning fields
- progress/state text
- final output fields
- provider/model metadata when needed by downstream nodes

This file should be the source of truth for graph state shape.

## Current Agent Patterns

### `text_writer`

Purpose:

- Generate new text from a prompt.

Architecture:

- single-node LangGraph
- custom-state protocol
- one streamable node: `write`

Main files:

- `agents/text_writer/definition.ts`
- `agents/text_writer/graph.ts`
- `agents/text_writer/state.ts`
- `agents/text_writer/write-node.ts`
- `agents/text_writer/WRITE_SYSTEM.md`

### `text_completer`

Purpose:

- Continue existing text from document context.

Architecture:

- single-node LangGraph
- custom-state protocol
- optimized for inline continuation rather than greenfield composition

### `text_enhance`

Purpose:

- Improve or rewrite existing selected text.

Architecture:

- single-node LangGraph
- custom-state protocol
- editing-focused prompt behavior

### `image_generator`

Purpose:

- Refine a prompt and generate an image result.

Architecture:

- multi-step graph
- prompt-refinement stage plus generation stage
- uses a direct `openai` SDK path for image generation work

### `researcher`

Purpose:

- Multi-step analysis and synthesis agent.

Architecture:

- multi-node LangGraph pipeline
- dedicated per-node model configurations
- only the final compose node streams user-facing tokens
- state messages are surfaced during execution

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

## Shared Execution Layer

The generic runtime for all AI agents lives in `src/main/ai/core`.

Key files:

- `core/definition.ts`
- `core/agent-registry.ts`
- `core/executor.ts`
- `core/types.ts`

### Execution Paths

`executeAIAgentsStream(...)` currently supports three modes:

1. Plain chat completion
2. LangGraph messages protocol
3. LangGraph custom-state protocol

Most agents in this codebase use the custom-state LangGraph path.

That means:

- the executor resolves provider and model details first
- `buildGraphInput(...)` maps request context into initial graph state
- the graph runs with streaming enabled
- `extractGraphOutput(...)` pulls final output from the graph state

### Why This Layer Exists

It keeps:

- task-handling concerns out of agent folders
- provider/model resolution out of nodes
- streaming behavior consistent across agents

This makes agents easier to test and evolve independently.

## Registration and Runtime Wiring

### Bootstrap

Concrete agents are registered in `src/main/bootstrap.ts`.

Today bootstrap does all of the following:

- creates `AgentRegistry`
- registers each concrete agent definition
- creates `ProviderResolver`
- registers one `AgentTaskHandler` per agent id
- registers extractors for indexing
- registers `IndexResourcesTaskHandler`

This is the canonical startup path.

### Task Entry

Inference requests enter through:

- `src/main/task/handlers/agent-task-handler.ts`

That handler:

- resolves the target agent from `AgentRegistry`
- resolves provider credentials through `ProviderResolver`
- creates either one chat model or a per-node model map
- invokes `executeAIAgentsStream(...)`
- forwards stream events to the task/event system

### Indexing Entry

Indexing requests enter through:

- `src/main/task/handlers/indexing-task-handler.ts`

That handler currently performs:

```text
load documents
  -> choose extractor by file extension
  -> extract text
  -> chunk text
  -> embed chunks
  -> save JSON vector store
  -> save indexing metadata
```

## RAG and Indexing

This folder is where both agentic inference and indexing infrastructure live.

The important split is:

- `agents/` handles inference behavior
- `rag/` handles retrieval preparation and storage

At the moment, indexing is implemented as a separate pipeline rather than as a fully retrieval-aware generation agent.

### What `rag/` Currently Provides

- `document-extractor.ts`
  Common extractor contract

- `extractor-registry.ts`
  Strategy-style registry for file extension to extractor resolution

- `extractors/plain-text-extractor.ts`
- `extractors/pdf-extractor.ts`
- `extractors/docx-extractor.ts`
  Concrete text extraction by file type

- `text-chunker.ts`
  LangChain text splitting wrapper

- `json-vector-store.ts`
  Lightweight persisted vector store implementation

- `indexing-manifest.ts`
  Metadata tracking for indexed files

### Current RAG Reality

The repo already has:

- document extraction
- chunking
- embeddings generation
- vector persistence
- indexing task orchestration

The repo does not yet have a first-class retrieval-aware agent under `agents/` that queries the vector store during generation.

If a retrieval agent is added later, it should live under `agents/` and depend on `rag/` as its retrieval layer, not duplicate RAG code inside the agent folder.

## Runtime Dependencies Used Here

These dependencies are already part of this subsystem.

### Inference and graph orchestration

- `@langchain/core`
  Messages, document types, model interfaces, embeddings interfaces

- `@langchain/langgraph`
  StateGraph definitions and compiled graphs

- `@langchain/openai`
  Chat and embeddings clients through LangChain

- `langchain`
  Broader LangChain runtime dependency used by the project

### Prompting and chunking

- `@langchain/textsplitters`
  Recursive chunking for indexing

### Direct provider SDK usage

- `openai`
  Used directly for image generation workflows

### Document extraction

- `pdf-parse`
  PDF content extraction

- `mammoth`
  DOCX extraction

### Internal support modules

- `src/main/shared/chat-model-factory.ts`
  Creates `ChatOpenAI` instances for OpenAI-compatible providers

- `src/main/shared/embedding-factory.ts`
  Creates `OpenAIEmbeddings` instances

- `src/main/shared/provider-resolver.ts`
  Resolves provider identity, model config, and API keys

## Conventions For New Agents

When adding a new inference agent, prefer this structure:

```text
src/main/ai/agents/my_agent/
  definition.ts
  graph.ts
  state.ts
  nodes/
    step-one-node.ts
    step-two-node.ts
  MY_SYSTEM.md
```

Guidelines:

- keep `definition.ts` declarative
- keep graph topology in `graph.ts`
- keep state contracts in `state.ts`
- keep authored prompts in `.md` files
- keep node logic focused and testable
- inject models via the graph/executor layer
- use `streamableNodes` to suppress internal-node noise
- use `extractStateMessage` when the UI should expose progress

## Conventions For Retrieval-Aware Agents

If this subsystem adds true RAG agents, keep the boundaries explicit.

Recommended split:

- retrieval/query orchestration in the new agent folder
- extractor and vector-store mechanics in `rag/`
- provider/model resolution in shared factories and resolver

Suggested layout:

```text
src/main/ai/agents/rag_agent/
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

Typical state fields for a RAG-capable agent would include:

- `query`
- `retrievedChunks`
- `citations`
- `response`

## Boundaries To Preserve

### Keep `agents/` product-focused

Do not put generic execution abstractions into concrete agent folders.

### Keep `core/` reusable

If logic is generic across multiple agents, it probably belongs in `core/`, not in one agent folder.

### Keep `rag/` isolated

Do not duplicate extraction, chunking, or vector-store logic inside agents.

### Keep provider resolution centralized

Do not scatter API-key and provider wiring through nodes.
Use:

- `ProviderResolver`
- `createChatModel(...)`
- `createEmbeddingModel(...)`

### Treat prompt files as functional code

Files like:

- `WRITE_SYSTEM.md`
- `ENHANCE_SYSTEM.md`
- `REFINE_PROMPT_SYSTEM.md`

directly affect runtime behavior and should be reviewed like code.

## Practical Extension Checklist

When adding a new inference agent:

1. Create a new folder under `src/main/ai/agents/`.
2. Add `definition.ts`, `graph.ts`, `state.ts`, and nodes.
3. Export it from `src/main/ai/agents/index.ts`.
4. Register it in `src/main/bootstrap.ts`.
5. Make sure `AgentTaskHandler` can resolve its model configuration.
6. Add focused tests for graph behavior and task execution.

When adding new indexing capability:

1. Extend `src/main/ai/rag/`.
2. Register new extractors in `src/main/bootstrap.ts`.
3. Keep orchestration in `indexing-task-handler.ts`.
4. Only connect agents to retrieval once the retrieval contract is explicit.

## Summary

`src/main/ai` is the home of the OpenWriter AI subsystem.

It combines:

- concrete agent behavior in `agents/`
- reusable execution infrastructure in `core/`
- indexing and retrieval-preparation infrastructure in `rag/`

If this subsystem expands, keep those layers cleanly separated:

- behavior in `agents/`
- execution in `core/`
- retrieval preparation in `rag/`
