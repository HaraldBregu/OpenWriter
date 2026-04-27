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
export { TextWriterAgent } from './text-writer';
export type {
	TextWriterAgentInput,
	TextWriterAgentOutput,
	TextWriterIntent,
	TextWriterIntentClassification,
	TextWriterPath,
	TextWriterRoute,
	TextWriterSkill,
	TextWriterSkillSelection,
} from './text-writer';
export { ContentWriterAgent } from './content-writer';
export type {
	ContentWriterAgentInput,
	ContentWriterAgentOptions,
	ContentWriterAgentOutput,
	ContentWriterCallParams,
	ContentWriterJsonSchema,
	ContentWriterLlmCaller,
	ContentWriterPhase,
	ContentWriterRoute,
	ContentWriterRouting,
	ContentWriterState,
	ContentWriterStreamParams,
} from './content-writer';
export { TextGeneratorV2Agent } from './text-generator-v2';
export type {
	TextGeneratorV2AgentInput,
	TextGeneratorV2AgentOutput,
	TextGeneratorV2Intent,
	TextGeneratorV2IntentClassification,
	TextGeneratorV2ParsedInput,
	TextGeneratorV2Target,
} from './text-generator-v2';
export {
	TextGeneratorV1Agent,
	runEditorAgent,
	SkillIdRegistry as TextGeneratorV1SkillIdRegistry,
} from './text-generator-v1';
export type {
	TextGeneratorV1AgentInput,
	TextGeneratorV1AgentOutput,
	TextGeneratorV1Context,
	TextGeneratorV1Intent,
	TextGeneratorV1IntentClassification,
	TextGeneratorV1ParsedInput,
	TextGeneratorV1SkillIdEntry,
	TextGeneratorV1Target,
	TextGeneratorV1ExecutionOutput,
} from './text-generator-v1';
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
export { TranscriptionAgent } from './transcription';
export type {
	TranscriptionAgentInput,
	TranscriptionAgentOutput,
	TranscriptionSegment,
	TranscriptionSourceKind,
	TranscriptionResponseFormat,
} from './transcription';
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
