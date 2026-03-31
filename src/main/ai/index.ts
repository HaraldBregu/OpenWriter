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
	TextCompleterAgent,
	TextEnhanceAgent,
	TextWriterAgent,
	WriterAgent,
	PainterAgent,
	ResearcherAgent,
} from './agents';

// Indexing
export type { DocumentExtractor, ExtractedContent } from './indexing';
export { ExtractorRegistry } from './indexing';
export { PlainTextExtractor } from './indexing';
export { PdfExtractor } from './indexing';
export { DocxExtractor } from './indexing';
export { chunkText, type ChunkOptions } from './indexing';
export { IndexingManifest, type ManifestEntry } from './indexing';
export { JsonVectorStore, type VectorEntry } from './indexing';
