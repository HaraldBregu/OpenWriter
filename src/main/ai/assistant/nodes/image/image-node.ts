import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AssistantState } from '../../state';
import { respondWithSpecialist } from '../shared/respond-with-specialist';
import SYSTEM_PROMPT from './IMAGE_SYSTEM.md?raw';

export function imageNode(
	state: typeof AssistantState.State,
	model: BaseChatModel
): Promise<Partial<typeof AssistantState.State>> {
	return respondWithSpecialist(state, model, SYSTEM_PROMPT);
}
