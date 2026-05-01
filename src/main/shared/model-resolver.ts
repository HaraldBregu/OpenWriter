const DEFAULT_TEXT_MODEL_ID = 'gpt-5.4-mini';

export class ModelResolver {
	resolve(options?: { modelId?: string }): { modelId: string } {
		const modelId = options?.modelId?.trim() || DEFAULT_TEXT_MODEL_ID;
		return { modelId };
	}
}
