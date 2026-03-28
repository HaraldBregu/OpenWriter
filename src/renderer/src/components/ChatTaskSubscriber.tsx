/**
 * ChatTaskSubscriber — bridges a running background task to the chat context.
 *
 * Renders no UI. Must be mounted inside both DocumentProvider and ChatProvider.
 * Subscribes to the active task for the current document and dispatches chat
 * context actions so the assistant message updates in real time.
 */

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { subscribeToTask } from '../services/task-event-bus';
import type { TaskSnapshot } from '../services/task-event-bus';
import { useChatState, useChatDispatch } from '../pages/document/context';
import { useDocumentState } from '../pages/document/hooks';

interface ResearcherTaskOutput {
	content: string;
	tokenCount: number;
	agentId: string;
}

export function ChatTaskSubscriber(): null {
	const dispatch = useChatDispatch();
	const { t } = useTranslation();
	const { documentId } = useDocumentState();
	const { activeTaskId, activeMessageId } = useChatState();

	const unsubscribeRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		// Clean up previous subscription whenever the active task changes.
		unsubscribeRef.current?.();
		unsubscribeRef.current = null;

		if (!activeTaskId || !activeMessageId) return;

		const taskId = activeTaskId;
		const messageId = activeMessageId;

		unsubscribeRef.current = subscribeToTask(taskId, (snapshot: TaskSnapshot) => {
			const metadataDocumentId = snapshot.metadata?.documentId;
			const targetDocumentId =
				typeof metadataDocumentId === 'string' && metadataDocumentId.length > 0
					? metadataDocumentId
					: documentId;

			// Ignore events routed to a different document.
			if (targetDocumentId !== documentId) return;

			switch (snapshot.status) {
				case 'queued':
				case 'started':
					dispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: messageId,
						patch: {
							content: t('agenticPanel.researcherThinking', 'Researching...'),
							taskId,
							status: 'queued',
						},
					});
					break;
				case 'running':
					if (snapshot.content) {
						dispatch({
							type: 'CHAT_MESSAGE_UPDATED',
							id: messageId,
							patch: { content: snapshot.content, taskId, status: 'running' },
						});
					}
					break;
				case 'completed': {
					const output = snapshot.result as ResearcherTaskOutput | undefined;
					dispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: messageId,
						patch: {
							content:
								output?.content ||
								snapshot.content ||
								t('agenticPanel.emptyResponse', 'No response received.'),
							taskId,
							status: 'completed',
						},
					});
					dispatch({ type: 'CHAT_ACTIVE_TASK_SET', taskId: null });
					dispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: null });
					break;
				}
				case 'error':
					dispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: messageId,
						patch: {
							content:
								snapshot.error || t('agenticPanel.error', 'The researcher failed to respond.'),
							taskId,
							status: 'error',
						},
					});
					dispatch({ type: 'CHAT_ACTIVE_TASK_SET', taskId: null });
					dispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: null });
					break;
				case 'cancelled':
					dispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: messageId,
						patch: {
							content: t('agenticPanel.cancelled', 'The researcher request was cancelled.'),
							taskId,
							status: 'cancelled',
						},
					});
					dispatch({ type: 'CHAT_ACTIVE_TASK_SET', taskId: null });
					dispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: null });
					break;
				default:
					break;
			}
		});

		return () => {
			unsubscribeRef.current?.();
			unsubscribeRef.current = null;
		};
	}, [activeTaskId, activeMessageId, documentId, dispatch, t]);

	return null;
}
