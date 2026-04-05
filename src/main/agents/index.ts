/**
 * agents/index.ts — agents subsystem barrel.
 *
 * Covers the core agent infrastructure, concrete agent implementations, and
 * the RAG subsystem (document extraction, chunking, vector storage).
 *
 * Definitions are plain exported constants. Registration is done explicitly
 * in bootstrapServices() via AgentRegistry.register(), following the same
 * pattern as TaskHandlerRegistry — visible, ordered, and test-isolation safe.
 */

// Core
export type { AgentDefinition, AgentDefinitionInfo, NodeModelConfig, NodeModelMap } from './core';
export { toAgentDefinitionInfo, AgentRegistry, executeAIAgentsStream } from './core';
export type { ExecutorInput, AgentStreamEvent, AgentRequest, AgentHistoryMessage } from './core';

// Agents
export { AssistantAgent } from './assistant/definition';
export { WriterAgent } from './writer/definition';

// Agent-side RAG
export {
	createRagChain,
	NO_CONTEXT_FINDING,
	runRagChain,
	RagRetriever,
} from './assistant/nodes/retrieve-documents';
