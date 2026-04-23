import type OpenAI from 'openai';
import { buildContext } from './context-builder';
import { execute } from './execution-engine';
import { parseInput } from './input-parser';
import { classifyIntent } from './intent-classifier';
import { mergeOutput, originalDocument } from './output-merger';
import { SkillRegistry } from './skill-registry';
import { resolveSkillIds, selectSkills } from './skill-selector';
import type { TextGeneratorV2AgentOutput } from './types';

const DEFAULT_MODEL_NAME = 'gpt-5.2';
const DEFAULT_PER_CALL_TIMEOUT_MS = 120_000;

export interface RunEditorAgentOptions {
	client: OpenAI;
	modelName?: string;
	skillIds?: Record<string, string>;
	skillIdRegistryPath?: string;
	perCallTimeoutMs?: number;
	stream?: boolean;
	signal: AbortSignal;
	onDelta?: (delta: string) => void;
	onEvent?: (kind: string, payload: unknown) => void;
}

export async function runEditorAgent(
	input: string,
	opts: RunEditorAgentOptions
): Promise<TextGeneratorV2AgentOutput> {
	const parsed = parseInput(input);
	opts.onEvent?.('input:parsed', parsed);

	const modelName = opts.modelName?.trim() || DEFAULT_MODEL_NAME;
	const perCallTimeoutMs = opts.perCallTimeoutMs ?? DEFAULT_PER_CALL_TIMEOUT_MS;

	const classification = await classifyIntent(
		opts.client,
		parsed,
		{ modelName, perCallTimeoutMs },
		opts.signal
	);
	opts.onEvent?.('intent', classification);

	const context = buildContext(parsed, classification);
	const skillNames = selectSkills(classification);
	const registry = await loadSkillRegistry(opts);
	const resolvedSkills = resolveSkillIds(skillNames, (name) => registry.get(name));
	opts.onEvent?.('skills:selected', {
		names: resolvedSkills.names,
		ids: resolvedSkills.ids,
		missing: resolvedSkills.missing,
	});

	const execution = await execute(
		opts.client,
		context,
		resolvedSkills.ids,
		{
			modelName,
			perCallTimeoutMs,
			stream: opts.stream,
			onDelta: opts.onDelta,
		},
		opts.signal
	);

	const finalDocument = mergeOutput(
		originalDocument(parsed),
		parsed.selectedText,
		execution.result,
		classification.intent,
		classification.target
	);

	return {
		content: finalDocument,
		finalDocument,
		intent: classification.intent,
		target: classification.target,
		selectedSkillNames: resolvedSkills.names,
		selectedSkillIds: execution.usedSkillIds,
		missingSkillNames: resolvedSkills.missing,
		responseId: execution.responseId,
		classification,
		rawResult: execution.result,
		stoppedReason: 'done',
	};
}

async function loadSkillRegistry(opts: RunEditorAgentOptions): Promise<SkillRegistry> {
	if (opts.skillIds) return SkillRegistry.fromMap(opts.skillIds);
	if (opts.skillIdRegistryPath) return SkillRegistry.fromFile(opts.skillIdRegistryPath);
	return SkillRegistry.fromMap({});
}

export { DEFAULT_MODEL_NAME as TEXT_GENERATOR_V2_DEFAULT_MODEL_NAME };

