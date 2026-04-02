import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../../services/logger';
import { extractTokenFromChunk } from '../../../../shared/ai-utils';
import { toLangChainHistoryMessages } from '../../../core/history';
import type { AssistantState } from '../../state';
import SYSTEM_PROMPT from './GRAMMAR_CHECK_SYSTEM.md?raw';

const EMPTY_PROMPT_FINDINGS =
	'Corrected request: \nInterpretation notes: No request provided.\nAmbiguities: Missing user input.';

const NO_ISSUES_FINDINGS = (prompt: string) =>
	`Corrected request: ${prompt}\nInterpretation notes: No material grammar issues detected.\nAmbiguities: None.`;

function buildHumanMessage(prompt: string): string {
	return ['Latest user request:', prompt].join('\n');
}

export async function grammarCheckNode(
	state: typeof AssistantState.State,
	model: BaseChatModel
): Promise<Partial<typeof AssistantState.State>> {
	const prompt = state.prompt.trim();

	if (prompt.length === 0) {
		return { grammarFindings: EMPTY_PROMPT_FINDINGS };
	}

	const messages = [
		new SystemMessage(SYSTEM_PROMPT),
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(buildHumanMessage(prompt)),
	];
	const response = await model.invoke(messages);
	const grammarFindings = extractTokenFromChunk(response.content).trim();

	return {
		grammarFindings: grammarFindings || NO_ISSUES_FINDINGS(prompt),
	};
}
