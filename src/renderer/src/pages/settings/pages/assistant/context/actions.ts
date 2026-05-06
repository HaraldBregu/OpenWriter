import type { AssistantMessage } from './state';

export type AssistantAction =
	| { type: 'INPUT_CHANGED'; value: string }
	| { type: 'MESSAGE_APPENDED'; message: AssistantMessage }
	| { type: 'RUN_STARTED' }
	| { type: 'RUN_FINISHED' }
	| { type: 'CLEARED' };
