/**
 * LangGraph definition for the Researcher agent.
 *
 * Topology:
 *
 *   START → understand → plan → research → compose → END
 *
 * Four-node pipeline:
 *   - understand : classifies query intent (non-streamed)
 *   - plan       : generates 3-5 research angles as JSON (non-streamed)
 *   - research   : synthesises knowledge from angles (non-streamed)
 *   - compose    : writes the final user-facing response (streamed)
 *
 * Each node receives its own dedicated model instance so temperature and
 * other sampling parameters can be tuned per-role. All models are injected
 * at graph build time — nodes never construct LLM instances themselves.
 */

import { StateGraph, START, END } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { NodeModelMap } from '../../core/definition';
import { ResearcherState } from './state';
import { understandNode } from './nodes/understand-node';
import { planNode } from './nodes/plan-node';
import { researchNode } from './nodes/research-node';
import { composeNode } from './nodes/compose-node';

export const RESEARCHER_NODE = {
	UNDERSTAND: 'understand',
	PLAN: 'plan_step',
	RESEARCH: 'research_step',
	COMPOSE: 'compose',
} as const;

export interface ResearcherNodeModels {
	[RESEARCHER_NODE.UNDERSTAND]: BaseChatModel;
	[RESEARCHER_NODE.PLAN]: BaseChatModel;
	[RESEARCHER_NODE.RESEARCH]: BaseChatModel;
	[RESEARCHER_NODE.COMPOSE]: BaseChatModel;
}

export function buildGraph(models: BaseChatModel | NodeModelMap) {
	const m = models as unknown as ResearcherNodeModels;

	return new StateGraph(ResearcherState)
		.addNode(RESEARCHER_NODE.UNDERSTAND, (state: typeof ResearcherState.State) =>
			understandNode(state, m[RESEARCHER_NODE.UNDERSTAND])
		)
		.addNode(RESEARCHER_NODE.PLAN, (state: typeof ResearcherState.State) =>
			planNode(state, m[RESEARCHER_NODE.PLAN])
		)
		.addNode(RESEARCHER_NODE.RESEARCH, (state: typeof ResearcherState.State) =>
			researchNode(state, m[RESEARCHER_NODE.RESEARCH])
		)
		.addNode(RESEARCHER_NODE.COMPOSE, (state: typeof ResearcherState.State) =>
			composeNode(state, m[RESEARCHER_NODE.COMPOSE])
		)
		.addEdge(START, RESEARCHER_NODE.UNDERSTAND)
		.addEdge(RESEARCHER_NODE.UNDERSTAND, RESEARCHER_NODE.PLAN)
		.addEdge(RESEARCHER_NODE.PLAN, RESEARCHER_NODE.RESEARCH)
		.addEdge(RESEARCHER_NODE.RESEARCH, RESEARCHER_NODE.COMPOSE)
		.addEdge(RESEARCHER_NODE.COMPOSE, END)
		.compile();
}

export { buildGraph as buildResearcherGraph };
