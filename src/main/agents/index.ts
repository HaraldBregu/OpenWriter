/**
 * Agents — feature-scoped AI capability strategies.
 *
 * Each subfolder owns a single capability (text, image, rag, ocr, ...) and
 * exports its Agent class plus its input/output types. Core primitives
 * (Agent interface, BaseAgent, AgentRegistry) live under `./core`.
 *
 * New agents follow the same shape:
 *   1. Create `agents/<name>/` with `types.ts`, `<name>-agent.ts`, `index.ts`.
 *   2. Extend `BaseAgent<Input, Output>` and implement `run`.
 *   3. Re-export from this barrel.
 */

export * from './core';
export { TextAgent } from './text';
export type { TextAgentInput, TextAgentOutput } from './text';
export { ImageAgent } from './image';
export type {
	ImageAgentInput,
	ImageAgentOutput,
	ImageSize,
	ImageResponseFormat,
	GeneratedImage,
} from './image';
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
