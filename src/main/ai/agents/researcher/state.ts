/**
 * Graph state annotation for the Researcher agent.
 *
 * Each field is a plain overwrite channel — reducers always replace the
 * previous value. The service layer injects the initial `prompt`; all
 * remaining fields are populated progressively by the pipeline nodes.
 *
 * Topology: understand → evaluate → plan → research → compose
 *   - understand : classifies user intent         → intent
 *   - evaluate   : determines response strategy   → strategy
 *   - plan       : generates sub-questions        → plan
 *   - research   : synthesises knowledge          → research
 *   - compose    : writes final response          → response
 */

import { Annotation } from '@langchain/langgraph';

export const ResearcherState = Annotation.Root({
	/** Raw user input. Injected by the service before graph execution. */
	prompt: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	/** Intent classification produced by the understand node. */
	intent: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	/**
	 * Response strategy produced by the evaluate node.
	 * Describes the optimal approach, depth level, format preferences,
	 * and any special considerations for this query.
	 */
	strategy: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	/** Ordered research angles / sub-questions produced by the plan node. */
	plan: Annotation<string[]>({
		reducer: (_a, b) => b,
		default: () => [],
	}),

	/** Synthesised knowledge produced by the research node. */
	research: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),

	/** Final composed response produced by the compose node. */
	response: Annotation<string>({
		reducer: (_a, b) => b,
		default: () => '',
	}),
});
