export const ASSISTANT_STATE_MESSAGES = {
	INTENT_DETECTOR: 'Detecting intent...',
	PLANNER: 'Planning response...',
	PARALLEL_SPECIALISTS: 'Running specialist agents...',
	ANALYZER: 'Reviewing specialist outputs...',
	ENHANCER: 'Polishing response...',
	IMAGE_PROMPT_ENHANCER: 'Enhancing image prompt...',
	IMAGE_GENERATOR: 'Preparing image generation response...',
} as const;
