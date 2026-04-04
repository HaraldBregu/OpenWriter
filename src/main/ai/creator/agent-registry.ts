import type { CreatorAgent, CreatorAgentId } from './types';

type AnyCreatorAgent = CreatorAgent<unknown, unknown>;

export class CreatorAgentRegistry {
	private readonly agents = new Map<CreatorAgentId, AnyCreatorAgent>();

	register<Input, Output>(agent: CreatorAgent<Input, Output>): void {
		if (this.agents.has(agent.id)) {
			throw new Error(`Creator agent "${agent.id}" is already registered.`);
		}

		this.agents.set(agent.id, agent as AnyCreatorAgent);
	}

	get<Input, Output>(id: CreatorAgentId): CreatorAgent<Input, Output> | undefined {
		return this.agents.get(id) as CreatorAgent<Input, Output> | undefined;
	}

	list(): AnyCreatorAgent[] {
		return [...this.agents.values()];
	}

	has(id: CreatorAgentId): boolean {
		return this.agents.has(id);
	}
}
