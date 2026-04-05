/*
# Assistant Graph Guide

`src/main/agents/assistant` implements the general-purpose assistant graph used
for chat. The runtime follows this direct-or-RAG retrieval topology:

```mermaid
flowchart TD
	Start([START]) --> Input["User Question"]
	Input --> Router["route_question"]
	Router -->|direct| Direct["generate_direct_answer"]
	Router -->|rag| Retrieve["retrieve_documents"]
	Retrieve --> VectorStore[(Vector Store)]
	VectorStore --> Grade["grade_documents"]
	Grade -->|relevant| Generate["generate_answer"]
	Grade -->|not relevant| Rewrite["rewrite_query"]
	Rewrite --> Retry{"retry_count < max_retries?"}
	Retry -->|yes| Retrieve
	Retry -->|no| Fallback["return_fallback_response"]
	Direct --> End([END])
	Generate --> End
	Fallback --> End
```

## Node Responsibilities

- `route_question`
  Normalizes the user question and decides whether the assistant can answer
  directly or needs workspace retrieval.

- `retrieve_documents`
  Runs workspace retrieval against the indexed vector store. Retrieval uses
  multi-query lookup, distance-aware filtering, and adjacent-chunk expansion
  from the saved document index.

- `grade_documents`
  Decides whether the retrieved workspace context is relevant enough to answer
  the question.

- `rewrite_query`
  Rewrites the retrieval query when the previous retrieval attempt was not
  relevant enough.

- `generate_direct_answer`
  Produces the final user-facing answer when no retrieval is needed.

- `generate_answer`
  Produces the final user-facing answer from retrieved workspace context.

- `return_fallback_response`
  Produces the final user-facing fallback when retrieval retries do not surface
  relevant workspace context.

## State Fields

- `prompt`: raw user input
- `history`: prior conversation turns
- `normalizedPrompt`: normalized question from `route_question`
- `routingFindings`: internal routing note
- `routeDecision`: `direct` or `rag`
- `retrievalQuery`: current workspace retrieval query
- `retrievedContext`: summarized retrieved workspace findings
- `retrievalStatus`: `idle`, `found`, `empty`, or `unavailable`
- `documentsRelevant`: whether grading marked the retrieved context as relevant
- `gradeFindings`: relevance grading note
- `retryCount`: number of rewrite attempts already used
- `maxRetries`: maximum allowed rewrite attempts
- `phaseLabel`: UI-visible progress label
- `response`: final user-facing output

## Folder Layout

- `graph.ts`
  Builds the LangGraph topology.

- `definition.ts`
  Declares assistant metadata, node models, graph preparation, and I/O hooks.

- `nodes/index.ts`
  Defines the live node registry used by the graph.

- `nodes/route-question/index.ts`
  Implements the `route_question` node.

- `nodes/retrieve-documents/index.ts`
  Implements the `retrieve_documents` node.

- `nodes/retrieve-documents/retriever.ts`
  Loads the workspace vector store and document index for retrieval.

- `nodes/retrieve-documents/chain.ts`
  Summarizes retrieved workspace context into assistant findings.

- `nodes/grade-documents/index.ts`
  Implements the `grade_documents` node.

- `nodes/rewrite-query/index.ts`
  Implements the `rewrite_query` node.

- `nodes/generate-direct-answer/index.ts`
  Implements the `generate_direct_answer` node.

- `nodes/generate-answer/index.ts`
  Implements the `generate_answer` node.

- `nodes/return-fallback-response/index.ts`
  Implements the `return_fallback_response` node.
*/
