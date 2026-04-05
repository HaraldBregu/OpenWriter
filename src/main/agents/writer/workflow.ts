import type { AgentStreamEvent } from '../core';
import type { CustomAgentExecutionInput } from '../core';
import { classifyError, toUserMessage } from '../../shared/ai-utils';
import { WRITER_PHASE_MESSAGES } from './messages';
import { streamWriterBrainstormNode } from './brainstorm-node';
import { streamWriterDraftNode } from './draft-node';
import { runWriterOutlineNode, streamWriterOutlineNode } from './outline-node';
import { runWriterRouterNode } from './router-node';
import { streamWriterRewriteNode } from './rewrite-node';
import type { WriterNodeContext } from './shared';

const LOG_SOURCE = 'WriterAgent';

function assertNotAborted(signal?: AbortSignal): void {
	if (signal?.aborted) {
		throw new DOMException('Aborted', 'AbortError');
	}
}

async function* streamNodeResult(
	runId: string,
	stream: AsyncGenerator<string>
): AsyncGenerator<AgentStreamEvent, { content: string; tokenCount: number }, void> {
	let content = '';
	let tokenCount = 0;

	for await (const token of stream) {
		content += token;
		tokenCount++;
		yield { type: 'token', token, runId };
	}

	return { content, tokenCount };
}

export async function* executeWriterAgent(
	input: CustomAgentExecutionInput
): AsyncGenerator<AgentStreamEvent> {
	const { runId, provider, prompt, history, temperature, maxTokens, signal, logger } = input;

	const nodeContext: WriterNodeContext = {
		provider,
		history,
		prompt,
		temperature,
		maxTokens,
		signal,
	};

	let content = '';
	let tokenCount = 0;

	try {
		yield { type: 'thinking', content: WRITER_PHASE_MESSAGES.ROUTER, runId };
		const decision = await runWriterRouterNode(nodeContext);
		logger?.info(LOG_SOURCE, `Router selected ${decision.route}`, {
			reason: decision.reason,
		});

		assertNotAborted(signal);

		switch (decision.route) {
			case 'brainstorm': {
				yield { type: 'thinking', content: WRITER_PHASE_MESSAGES.BRAINSTORM, runId };
				const result = yield* streamNodeResult(runId, streamWriterBrainstormNode(nodeContext));
				content = result.content;
				tokenCount = result.tokenCount;
				break;
			}

			case 'outline': {
				yield { type: 'thinking', content: WRITER_PHASE_MESSAGES.OUTLINE, runId };
				const result = yield* streamNodeResult(runId, streamWriterOutlineNode(nodeContext));
				content = result.content;
				tokenCount = result.tokenCount;
				break;
			}

			case 'rewrite': {
				yield { type: 'thinking', content: WRITER_PHASE_MESSAGES.REWRITE, runId };
				const result = yield* streamNodeResult(runId, streamWriterRewriteNode(nodeContext));
				content = result.content;
				tokenCount = result.tokenCount;
				break;
			}

			case 'draft':
			default: {
				yield { type: 'thinking', content: WRITER_PHASE_MESSAGES.DRAFT_PLAN, runId };
				const outline = await runWriterOutlineNode(nodeContext);
				assertNotAborted(signal);
				yield { type: 'thinking', content: WRITER_PHASE_MESSAGES.DRAFT, runId };
				const result = yield* streamNodeResult(runId, streamWriterDraftNode(nodeContext, outline));
				content = result.content;
				tokenCount = result.tokenCount;
				break;
			}
		}

		yield { type: 'done', content, tokenCount, runId };
	} catch (error: unknown) {
		const kind = classifyError(error);

		if (kind === 'abort') {
			yield { type: 'error', error: 'Cancelled', code: 'abort', runId };
			return;
		}

		const rawMessage = error instanceof Error ? error.message : String(error);
		logger?.error(LOG_SOURCE, `Writer execution failed (${kind}): ${rawMessage}`);
		yield { type: 'error', error: toUserMessage(kind, rawMessage), code: kind, runId };
	}
}
