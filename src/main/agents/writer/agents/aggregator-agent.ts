import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../services/logger';
import { toLangChainHistoryMessages } from '../../core/history';
import { WRITER_STATE_MESSAGES } from '../messages';
import {
	createWriterSpecialistAgent,
	streamWriterSpecialist,
	type WriterSpecialistAgent,
} from '../specialist-agent';
import { WriterState } from '../state';

const SYSTEM_PROMPT = `You are the final aggregator in a writer multi-agent workflow.

You receive the user's request, prior conversation, router notes, and optional
workspace retrieval and web search findings.

Produce the final user-facing response.

Rules:

- Answer the request directly and naturally.
- If router notes indicate the request is simple, answer directly without
  pretending extra research happened.
- Use workspace retrieval findings only when they are relevant and reliable.
- Use web search findings only when they are relevant and reliable.
- If research came back weak or incomplete, say so plainly rather than
  inventing facts.
- Do not mention internal nodes, routing, or hidden analysis.`;

function buildHumanMessage(state: typeof WriterState.State): string {
	return [
		'Original user request:',
		state.prompt,
		'',
		'Normalized request:',
		state.normalizedPrompt || state.prompt,
		'',
		'Router notes:',
		'<routing_findings>',
		state.routingFindings || 'No router notes were generated.',
		'</routing_findings>',
		'',
		'Workspace retrieval findings:',
		'<rag_findings>',
		state.ragFindings || 'No workspace findings were generated.',
		'</rag_findings>',
		'',
		'Web search findings:',
		'<web_findings>',
		state.webFindings || 'No web findings were generated.',
		'</web_findings>',
	].join('\n');
}

export function createAggregatorAgent(model: BaseChatModel): WriterSpecialistAgent {
	return createWriterSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function aggregatorAgent(
	state: typeof WriterState.State,
	agent: WriterSpecialistAgent,
	logger?: LoggerService
): Promise<Partial<typeof WriterState.State>> {
	const prompt = state.prompt.trim();

	if (prompt.length === 0) {
		logger?.debug('WriterAggregatorAgent', 'Skipping aggregation for empty prompt');
		return {
			phaseLabel: WRITER_STATE_MESSAGES.AGGREGATOR,
			response: '',
		};
	}

	logger?.debug('WriterAggregatorAgent', 'Starting aggregation', {
		promptLength: state.prompt.length,
		ragFindingsLength: state.ragFindings.length,
		webFindingsLength: state.webFindings.length,
	});

	const messages = [
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(buildHumanMessage(state)),
	];
	const response = await streamWriterSpecialist(agent, messages);

	logger?.info('WriterAggregatorAgent', 'Aggregation completed', {
		responseLength: response.length,
	});

	return {
		phaseLabel: WRITER_STATE_MESSAGES.AGGREGATOR,
		response,
	};
}
