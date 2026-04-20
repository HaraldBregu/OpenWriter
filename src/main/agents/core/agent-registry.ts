import type { Agent } from './agent';

/**
 * AgentRegistry — type-to-instance map for agents, mirroring
 * TaskHandlerRegistry so wiring stays symmetric across subsystems.
 */
export class AgentRegistry {
	private readonly agents = new Map<string, Agent>();

	register(agent: Agent): void {
		if (this.agents.has(agent.type)) {
			throw new Error(`Agent already registered: ${agent.type}`);
		}
		this.agents.set(agent.type, agent);
	}

	get<TInput = unknown, TOutput = unknown>(type: string): Agent<TInput, TOutput> {
		const agent = this.agents.get(type);
		if (!agent) {
			throw new Error(`Unknown agent type: ${type}`);
		}
		return agent as Agent<TInput, TOutput>;
	}

	has(type: string): boolean {
		return this.agents.has(type);
	}

	listTypes(): string[] {
		return Array.from(this.agents.keys());
	}

	clear(): void {
		this.agents.clear();
	}
}
