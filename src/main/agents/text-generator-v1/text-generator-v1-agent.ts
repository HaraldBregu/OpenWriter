import { BaseAgent } from '../core/base-agent';
import type { AgentContext } from '../core/agent';
import { AgentValidationError } from '../core/agent-errors';
import { createOpenAIClient } from '../../shared/chat-model-factory';
import { classifyIntent } from './intent-classifier';
import { executeWithSkills } from './execution-engine';
import { parseInput } from './input-parser';
import { mergeOutput } from './output-merger';
import { resolveSkillIds, selectSkills } from './skill-selector';
import { SkillIdRegistry } from './skill-id-registry';
import type {
	TextGeneratorV1AgentInput,
	TextGeneratorV1AgentOutput,
	TextGeneratorV1Context,
} from './types';

const DEFAULT_MODEL = 'gpt-5.2';
const DEFAULT_PER_CALL_TIMEOUT_MS = 120_000;

export class TextGeneratorV1Agent extends BaseAgent<
	TextGeneratorV1AgentInput,
	TextGeneratorV1AgentOutput
> {
	readonly type = 'text-generator-v1';

	validate(input: TextGeneratorV1AgentInput): void {
		if (!input.raw?.trim()) {
			throw new AgentValidationError(this.type, 'raw input required');
		}
		if (!input.providerId?.trim()) {
			throw new AgentValidationError(this.type, 'providerId required');
		}
		if (!input.apiKey?.trim()) {
			throw new AgentValidationError(this.type, 'apiKey required');
		}
	}

	protected async run(
		input: TextGeneratorV1AgentInput,
		ctx: AgentContext
	): Promise<TextGeneratorV1AgentOutput> {
		const modelName = input.modelName?.trim() || DEFAULT_MODEL;
		const perCallTimeoutMs = input.perCallTimeoutMs ?? DEFAULT_PER_CALL_TIMEOUT_MS;
		const client = createOpenAIClient(input.providerId, input.apiKey);

		// Layer 1 — INPUT PARSER
		this.ensureNotAborted(ctx.signal);
		const parsed = parseInput(input.raw);
		ctx.onEvent?.({
			kind: 'text-generator-v1:parsed',
			at: Date.now(),
			payload: {
				hasSelection: Boolean(parsed.selectedText),
				promptPreview: parsed.prompt.slice(0, 120),
			},
		});

		// Layer 2 — INTENT CLASSIFIER
		this.ensureNotAborted(ctx.signal);
		const classification = await classifyIntent(
			client,
			parsed,
			{ modelName, perCallTimeoutMs },
			ctx.signal
		);
		ctx.logger.info('TextGeneratorV1', 'intent classified', {
			intent: classification.intent,
			target: classification.target,
			style: classification.style,
		});
		ctx.onEvent?.({
			kind: 'text-generator-v1:intent',
			at: Date.now(),
			payload: classification,
		});

		// Layer 3 — CONTEXT BUILDER
		const operateOn =
			classification.target === 'selection' && parsed.selectedText
				? parsed.selectedText
				: parsed.fullText;
		const context: TextGeneratorV1Context = { parsed, classification, operateOn };

		// Skill selection (rule-based) + resolve ids via registry
		const registry = await this.resolveRegistry(input);
		const skillNames = selectSkills(classification);
		const { names, ids, missing } = resolveSkillIds(skillNames, (n) => registry.get(n));
		if (missing.length > 0) {
			ctx.logger.warn(
				'TextGeneratorV1',
				`Skill ids missing for: ${missing.join(', ')}. Proceeding without them.`,
				{ registrySize: registry.size() }
			);
		}
		ctx.onEvent?.({
			kind: 'text-generator-v1:skills',
			at: Date.now(),
			payload: { selected: names, ids, missing },
		});

		// Layer 4 — EXECUTION ENGINE (shell + skills via Responses API)
		this.ensureNotAborted(ctx.signal);
		const execution = await executeWithSkills(
			client,
			context,
			ids,
			{
				modelName,
				perCallTimeoutMs,
				stream: input.stream === true,
				onDelta: (delta) =>
					ctx.onEvent?.({ kind: 'text', at: Date.now(), payload: { text: delta } }),
			},
			ctx.signal
		);
		ctx.onEvent?.({
			kind: 'text-generator-v1:executed',
			at: Date.now(),
			payload: { responseId: execution.responseId, skillIdCount: ids.length },
		});

		// Layer 5 — OUTPUT MERGER
		const finalDocument = mergeOutput(parsed, execution.result, classification.intent);

		return {
			finalDocument,
			intent: classification.intent,
			target: classification.target,
			selectedSkillNames: names,
			selectedSkillIds: ids,
			responseId: execution.responseId,
			classification,
			rawResult: execution.result,
		};
	}

	private async resolveRegistry(input: TextGeneratorV1AgentInput): Promise<SkillIdRegistry> {
		if (input.skillIds && Object.keys(input.skillIds).length > 0) {
			return SkillIdRegistry.fromMap(input.skillIds);
		}
		if (input.skillIdRegistryPath) {
			return SkillIdRegistry.fromFile(input.skillIdRegistryPath);
		}
		return SkillIdRegistry.fromMap({});
	}
}

/**
 * Convenience entry point matching the spec signature `runEditorAgent(input)`.
 *
 * Accepts either a raw tagged string or a full agent input object.
 * Not needed if callers use the AgentRegistry — provided for direct script use.
 */
export async function runEditorAgent(
	input: TextGeneratorV1AgentInput,
	ctx: AgentContext
): Promise<TextGeneratorV1AgentOutput> {
	const agent = new TextGeneratorV1Agent();
	return agent.execute(input, ctx);
}
