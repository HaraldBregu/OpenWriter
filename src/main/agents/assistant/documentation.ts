/*
# Assistant Graph Guide

`src/main/agents/assistant` implements the general-purpose assistant graph used
for chat. The runtime now follows a compact node topology:

```mermaid
flowchart LR
	Start([START]) --> Intent["intent_analyzer<br/>classifies question vs generation/research<br/>builds RAG + web queries"]
	Intent -->|question| Response["response_preparer<br/>writes final answer"]
	Intent -->|generation / research| Rag["rag_retrieval<br/>loads workspace context"]
	Intent -->|generation / research| Web["web_research<br/>looks up external context"]
	Rag --> Response
	Web --> Response
	Response --> End([END])
```

## Node Responsibilities

- `intent_analyzer`
  Normalizes the prompt, classifies it as `question`, `generation`, or
  `research`, and decides whether to launch parallel research nodes.

- `rag_retrieval`
  Runs workspace retrieval against the indexed vector store. Retrieval now uses
  multi-query lookup, distance-aware filtering, and adjacent-chunk expansion
  from the saved document index.

- `web_research`
  Runs external search and summarizes the results into internal findings.

- `response_preparer`
  Produces the final user-facing answer. Direct questions go here immediately;
  generation/research requests reach it after RAG + web research complete.

## State Fields

- `prompt`: raw user input
- `history`: prior conversation turns
- `normalizedPrompt`: normalized request from the intent analyzer
- `intentCategory`: `question`, `generation`, or `research`
- `intentFindings`: internal routing note
- `needsParallelResearch`: whether RAG + web research should run
- `needsRetrieval`: whether the RAG node should execute
- `needsWebSearch`: whether the web research node should execute
- `ragQuery`: focused workspace retrieval query
- `webSearchQuery`: focused online research query
- `ragFindings`: summarized workspace findings
- `webFindings`: summarized external findings
- `phaseLabel`: UI-visible progress label
- `response`: final user-facing output

## Folder Layout

- `graph.ts`
  Builds the LangGraph topology.

- `definition.ts`
  Declares assistant metadata, node models, graph preparation, and I/O hooks.

- `nodes/index.ts`
  Defines the live node registry used by the graph.

- `nodes/intent-analyzer/index.ts`
  Implements the `intent_analyzer` node.

- `nodes/rag-retrieval/index.ts`
  Implements the `rag_retrieval` node.

- `nodes/rag-retrieval/retriever.ts`
  Loads the workspace vector store and document index for retrieval.

- `nodes/rag-retrieval/chain.ts`
  Summarizes retrieved workspace context into assistant findings.

- `nodes/web-research/index.ts`
  Implements the `web_research` node.

- `nodes/response-preparer/index.ts`
  Implements the `response_preparer` node.
*/
