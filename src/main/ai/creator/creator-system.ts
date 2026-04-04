import type { LoggerService } from '../../services/logger';
import { CreatorAgentRegistry } from './agent-registry';
import { CreatorRouterAgent } from './router/router-agent';
import {
	CREATOR_ROUTER_AGENT_ID,
	type CreatorAgent,
	type CreatorAgentId,
	type CreatorRequest,
	type CreatorRouteDecision,
} from './types';

export class CreatorSystem {
	private readonly registry: CreatorAgentRegistry;

	constructor(logger?: LoggerService, registry?: CreatorAgentRegistry) {
		this.registry = registry ?? new CreatorAgentRegistry();

		if (!this.registry.has(CREATOR_ROUTER_AGENT_ID)) {
			this.registry.register(new CreatorRouterAgent(logger));
		}
	}

	registerAgent<Input, Output>(agent: CreatorAgent<Input, Output>): void {
		this.registry.register(agent);
	}

	getAgent<Input, Output>(agentId: CreatorAgentId): CreatorAgent<Input, Output> | undefined {
		return this.registry.get(agentId);
	}

	listAgents(): Array<{ id: CreatorAgentId; name: string }> {
		return this.registry.list().map((agent) => ({
			id: agent.id,
			name: agent.name,
		}));
	}

	async route(request: CreatorRequest): Promise<CreatorRouteDecision> {
		const router = this.registry.get<CreatorRequest, CreatorRouteDecision>(CREATOR_ROUTER_AGENT_ID);

		if (!router) {
			throw new Error('Creator router agent is not registered.');
		}

		return router.run(request);
	}
}
