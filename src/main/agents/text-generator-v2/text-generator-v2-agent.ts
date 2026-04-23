import { createOpenAIClient } from '../../shared/chat-model-factory';
import type { AgentContext } from '../core/agent';
import { AgentValidationError } from '../core/agent-errors';
import { BaseAgent } from '../core/base-agent';
import {
	runEditorAgent,
	TEXT_GENERATOR_V2_DEFAULT_MODEL_NAME,
} from './run-editor-agent';
import type { TextGeneratorV2AgentInput, TextGeneratorV2AgentOutput } from './types';

const DEFAULT_PER_CALL_TIMEOUT_MS = 120_000;

export class TextGeneratorV2Agent extends BaseAgent<
	TextGeneratorV2AgentInput,
	TextGeneratorV2AgentOutput
> {
	readonly type = 'text-generator-v2';

	validate(input: TextGeneratorV2AgentInput): void {
		if (!input.raw?.trim()) throw new AgentValidationError(this.type, 'raw input required');
		if (!input.providerId?.trim())
			throw new AgentValidationError(this.type, 'providerId required');
		if (!input.apiKey?.trim()) throw new AgentValidationError(this.type, 'apiKey required');
	}

	protected async run(
		input: TextGeneratorV2AgentInput,
		ctx: AgentContext
	): Promise<TextGeneratorV2AgentOutput> {
		const client = createOpenAIClient(input.providerId, input.apiKey);
		const modelName = input.modelName?.trim() || TEXT_GENERATOR_V2_DEFAULT_MODEL_NAME;
		const perCallTimeoutMs = input.perCallTimeoutMs ?? DEFAULT_PER_CALL_TIMEOUT_MS;

		return runEditorAgent(input.raw, {
			client,
			modelName,
			skillIds: input.skillIds,
			skillIdRegistryPath: input.skillIdRegistryPath,
			perCallTimeoutMs,
			stream: input.stream,
			signal: ctx.signal,
			onDelta: (delta) => ctx.onEvent?.({ kind: 'text', at: Date.now(), payload: { text: delta } }),
			onEvent: (kind, payload) => ctx.onEvent?.({ kind, at: Date.now(), payload }),
		});
	}
}

