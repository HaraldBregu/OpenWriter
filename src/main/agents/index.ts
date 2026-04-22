/**
 * Agents — feature-scoped AI capability strategies.
 *
 * Each subfolder owns a single capability (assistant, rag, ocr, ...) and
 * exports its Agent class plus its input/output types. Core primitives
 * (Agent interface, BaseAgent, AgentRegistry) live under `./core`.
 */

export * from './core';
export { AssistantAgent } from './assistant';
export type { AssistantAgentInput, AssistantAgentOutput } from './assistant';
export { WriterAgent } from './writer';
export type {
	WriterAgentInput,
	WriterAgentOutput,
	WriterDecision,
	WriterAction,
	WriterIntent,
	WriterIntentClassification,
	WriterSkill,
} from './writer';
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
export {
	SkillRegistry,
	SkillError,
	SkillLoadError,
	SkillNotFoundError,
	SkillValidationError,
	SkillParser,
	FileSystemSkillSource,
	FileSystemSkillRepository,
	buildSkillsPrompt,
	buildSkillsSnapshot,
	renderSkillInstructions,
} from './skills';
export type {
	Skill,
	SkillEntry,
	SkillMetadata,
	SkillExposure,
	SkillScope,
	SkillSnapshot,
	SkillSource,
	SkillLoadRecord,
	SkillRepository,
	ParsedSkill,
	ParseSkillOptions,
	FileSystemSkillSourceOptions,
	FileSystemSkillRepositoryOptions,
} from './skills';
