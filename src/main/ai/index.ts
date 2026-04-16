export { createAIClient } from './client';
export { AIAgent } from './agent';
export { RAGContextRetriever } from './retriever';
export type { RAGRetrieverConfig } from './retriever';
export {
  DEFAULT_MODEL,
  DEFAULT_MAX_COMPLETION_TOKENS,
  DEFAULT_TEMPERATURE,
  DEFAULT_RAG_TOP_K,
  DEFAULT_RAG_MAX_DISTANCE,
  MAX_TOOL_CALL_ITERATIONS
} from './constants';
export type {
  AgentConfig,
  AgentResponse,
  ChatOptions,
  ContextRetriever,
  RetrievedContext,
  StreamChunk,
  ToolHandler
} from './types';
