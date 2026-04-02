import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { toLangChainHistoryMessages } from '../../../../core/history';
import type { AssistantState } from '../../state';
import { phaseLabelForIntent } from '../../messages';
import SYSTEM_PROMPT from './UNDERSTAND_SYSTEM.md?raw';

export type AssistantIntent = 'conversation' | 'writing' | 'editing' | 'research' | 'image';

function inferIntent(text: string): AssistantIntent {
	const normalized = text.trim().toLowerCase();

	if (normalized === 'conversation') return 'conversation';
	if (normalized === 'writing') return 'writing';
	if (normalized === 'editing') return 'editing';
	if (normalized === 'research') return 'research';
	if (normalized === 'image') return 'image';

	if (
		/\b(image|illustration|visual|artwork|poster|cover|logo|draw|paint|generate an image|image prompt)\b/i.test(
			text
		)
	) {
		return 'image';
	}

	if (/\b(edit|rewrite|revise|polish|improve|fix|tighten|shorten|expand)\b/i.test(text)) {
		return 'editing';
	}

	if (
		/\b(research|compare|analysis|analyze|investigate|background|overview|pros and cons|trade-?offs)\b/i.test(
			text
		)
	) {
		return 'research';
	}

	if (/\b(write|draft|compose|create|story|article|email|essay|poem|script)\b/i.test(text)) {
		return 'writing';
	}

	return 'conversation';
}

export async function understandNode(
	state: typeof AssistantState.State,
	model: BaseChatModel
): Promise<Partial<typeof AssistantState.State>> {
	const messages = [
		new SystemMessage(SYSTEM_PROMPT),
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(state.prompt),
	];

	const response = await model.invoke(messages);
	const content = typeof response.content === 'string' ? response.content.trim() : '';
	const intent = inferIntent(content);

	return {
		intent,
		phaseLabel: phaseLabelForIntent(intent),
	};
}
