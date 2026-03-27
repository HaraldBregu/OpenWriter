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
import { ResearcherState } from './researcher-state';
import { understandNode } from './nodes/understand-node';
import { planNode } from './nodes/plan-node';
import { researchNode } from './nodes/research-node';
import { composeNode } from './nodes/compose-node';

export const RESEARCHER_NODE = {
	UNDERSTAND: 'understand',
	PLAN: 'plan',
	RESEARCH: 'research',
	COMPOSE: 'compose',
} as const;

export interface ResearcherNodeModels {
	understand: BaseChatModel;
	plan: BaseChatModel;
	research: BaseChatModel;
	compose: BaseChatModel;
}

export function buildResearcherGraph(models: ResearcherNodeModels) {
	return new StateGraph(ResearcherState)
		.addNode(RESEARCHER_NODE.UNDERSTAND, (state: typeof ResearcherState.State) =>
			understandNode(state, models.understand)
		)
		.addNode(RESEARCHER_NODE.PLAN, (state: typeof ResearcherState.State) =>
			planNode(state, models.plan)
		)
		.addNode(RESEARCHER_NODE.RESEARCH, (state: typeof ResearcherState.State) =>
			researchNode(state, models.research)
		)
		.addNode(RESEARCHER_NODE.COMPOSE, (state: typeof ResearcherState.State) =>
			composeNode(state, models.compose)
		)
		.addEdge(START, RESEARCHER_NODE.UNDERSTAND)
		.addEdge(RESEARCHER_NODE.UNDERSTAND, RESEARCHER_NODE.PLAN)
		.addEdge(RESEARCHER_NODE.PLAN, RESEARCHER_NODE.RESEARCH)
		.addEdge(RESEARCHER_NODE.RESEARCH, RESEARCHER_NODE.COMPOSE)
		.addEdge(RESEARCHER_NODE.COMPOSE, END)
		.compile();
}
