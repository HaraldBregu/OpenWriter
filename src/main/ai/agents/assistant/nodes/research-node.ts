import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AssistantState } from '../state';
import { respondWithSpecialist } from './respond-with-specialist';
import SYSTEM_PROMPT from '../RESEARCH_SYSTEM.md?raw';

export function researchNode(
	state: typeof AssistantState.State,
	model: BaseChatModel
): Promise<Partial<typeof AssistantState.State>> {
	return respondWithSpecialist(state, model, SYSTEM_PROMPT);
}
