import type { CreatorAgent, CreatorAgentId } from './types';

export abstract class BaseCreatorAgent<Input, Output> implements CreatorAgent<Input, Output> {
	constructor(
		public readonly id: CreatorAgentId,
		public readonly name: string
	) {}

	abstract run(input: Input): Promise<Output>;

	protected normalizeText(value: string): string {
		return value.replace(/\s+/g, ' ').trim();
	}
}
