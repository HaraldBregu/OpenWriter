export const ASSISTANT_STATE_MESSAGES = {
	INTENT_DETECTOR: 'Detecting intent...',
	PLANNER: 'Planning response...',
	PARALLEL_SPECIALISTS: 'Running specialist agents...',
	ANALYZER: 'Reviewing specialist outputs...',
	ENHANCER: 'Polishing response...',
} as const;
