/**
 * Agents — feature-scoped AI capability strategies.
 *
 * Each subfolder owns a single capability (assistant, rag, ocr, ...) and
 * exports its Agent class plus its input/output types. Core primitives
 * (Agent interface, BaseAgent, AgentRegistry) live under `./core`.
 */

export * from './core';
export { AssistantAgent } from './assistant';
export type {
	AssistantAgentInput,
	AssistantAgentOutput,
	AssistantFile,
	AssistantToolCallRecord,
} from './assistant';
export { RagAgent, InMemoryVectorStore, splitText } from './rag';
export type {
	RagAgentInput,
	RagAgentOutput,
	RagIngestInput,
	RagIngestOutput,
	RagQueryInput,
	RagQueryOutput,
	RagDocumentSource,
} from './rag';
export { OcrAgent } from './ocr';
export type { OcrAgentInput, OcrAgentOutput, OcrPage, OcrSourceKind } from './ocr';
