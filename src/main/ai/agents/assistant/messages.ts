export const ASSISTANT_STATE_MESSAGES = {
	RAG: 'Searching documents...',
	UNDERSTAND: 'Understanding request...',
	CONVERSATION: 'Responding...',
	WRITING: 'Writing response...',
	EDITING: 'Editing response...',
	RESEARCH: 'Preparing researched response...',
	IMAGE: 'Preparing image response...',
} as const;

export function phaseLabelForIntent(intent: string): string {
	switch (intent) {
		case 'writing':
			return ASSISTANT_STATE_MESSAGES.WRITING;
		case 'editing':
			return ASSISTANT_STATE_MESSAGES.EDITING;
		case 'research':
			return ASSISTANT_STATE_MESSAGES.RESEARCH;
		case 'image':
			return ASSISTANT_STATE_MESSAGES.IMAGE;
		default:
			return ASSISTANT_STATE_MESSAGES.CONVERSATION;
	}
}
