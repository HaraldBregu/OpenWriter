/**
 * ai/index.ts — AI subsystem barrel.
 *
 * Covers the core agent infrastructure, concrete agent implementations, and
 * the indexing subsystem (document extraction, chunking, vector storage).
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
export {
	AssistantAgent,
	TextCompleterAgent,
	TextEnhanceAgent,
	TextWriterAgent,
	WriterAgent,
	PainterAgent,
	ResearcherAgent,
} from './agents';

// RAG
export type { DocumentExtractor, ExtractedContent } from './rag';
export { ExtractorRegistry } from './rag';
export { PlainTextExtractor } from './rag';
export { PdfExtractor } from './rag';
export { DocxExtractor } from './rag';
export { chunkText, type ChunkOptions } from './rag';
export { RagManifest, type ManifestEntry } from './rag';
export { VectorStore, type VectorEntry } from './rag';
