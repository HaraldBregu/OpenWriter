/**
 * ChatTaskSubscriber — global component that bridges running background tasks
 * to the Redux chat state.
 *
 * Renders no UI. Subscribes to task events for every active chat session and
 * dispatches Redux actions so chat messages update regardless of whether the
 * document page is mounted.
 */

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { subscribeToTask } from '../services/task-event-bus';
import type { TaskSnapshot } from '../services/task-event-bus';
import { useAppDispatch, useAppSelector } from '../store';
import {
	selectAllActiveChatSessions,
	chatMessageUpdated,
	chatActiveTaskSet,
	chatActiveMessageSet,
} from '../store/chat';

interface ResearcherTaskOutput {
	content: string;
	tokenCount: number;
	agentId: string;
}

export function ChatTaskSubscriber(): null {
	const dispatch = useAppDispatch();
	const { t } = useTranslation();
	const activeSessions = useAppSelector(selectAllActiveChatSessions);

	// Track active subscriptions so we can avoid duplicates across re-renders
	// and clean up stale ones when sessions change.
	const subscriptionsRef = useRef<Map<string, () => void>>(new Map());

	useEffect(() => {
		const currentTaskIds = new Set<string>();

		for (const session of activeSessions) {
			const { documentId, taskId, messageId } = session;
			currentTaskIds.add(taskId);

			// Skip if we already have a subscription for this taskId.
			if (subscriptionsRef.current.has(taskId)) {
				continue;
			}

			const unsubscribe = subscribeToTask(taskId, (snapshot: TaskSnapshot) => {
				if (!messageId) {
					return;
				}
				const metadataDocumentId = snapshot.metadata?.documentId;
				const targetDocumentId =
					typeof metadataDocumentId === 'string' && metadataDocumentId.length > 0
						? metadataDocumentId
						: documentId;

				switch (snapshot.status) {
					case 'queued':
					case 'started':
						dispatch(
							chatMessageUpdated({
								documentId: targetDocumentId,
								id: messageId,
								patch: {
									content: t('agenticPanel.researcherThinking', 'Researching...'),
									taskId,
									status: 'queued',
								},
							})
						);
						break;
					case 'running':
						if (snapshot.content) {
							dispatch(
								chatMessageUpdated({
									documentId: targetDocumentId,
									id: messageId,
									patch: {
										content: snapshot.content,
										taskId,
										status: 'running',
									},
								})
							);
						}
						break;
					case 'completed': {
						const output = snapshot.result as ResearcherTaskOutput | undefined;
						dispatch(
							chatMessageUpdated({
								documentId: targetDocumentId,
								id: messageId,
								patch: {
									content:
										output?.content ||
										snapshot.content ||
										t('agenticPanel.emptyResponse', 'No response received.'),
									taskId,
									status: 'completed',
								},
							})
						);
						dispatch(chatActiveTaskSet({ documentId: targetDocumentId, taskId: null }));
						dispatch(chatActiveMessageSet({ documentId: targetDocumentId, messageId: null }));
						break;
					}
					case 'error':
						dispatch(
							chatMessageUpdated({
								documentId: targetDocumentId,
								id: messageId,
								patch: {
									content:
										snapshot.error || t('agenticPanel.error', 'The researcher failed to respond.'),
									taskId,
									status: 'error',
								},
							})
						);
						dispatch(chatActiveTaskSet({ documentId: targetDocumentId, taskId: null }));
						dispatch(chatActiveMessageSet({ documentId: targetDocumentId, messageId: null }));
						break;
					case 'cancelled':
						dispatch(
							chatMessageUpdated({
								documentId: targetDocumentId,
								id: messageId,
								patch: {
									content: t('agenticPanel.cancelled', 'The researcher request was cancelled.'),
									taskId,
									status: 'cancelled',
								},
							})
						);
						dispatch(chatActiveTaskSet({ documentId: targetDocumentId, taskId: null }));
						dispatch(chatActiveMessageSet({ documentId: targetDocumentId, messageId: null }));
						break;
					default:
						break;
				}
			});

			subscriptionsRef.current.set(taskId, unsubscribe);
		}

		// Clean up subscriptions for tasks that are no longer active.
		for (const [taskId, unsubscribe] of subscriptionsRef.current) {
			if (!currentTaskIds.has(taskId)) {
				unsubscribe();
				subscriptionsRef.current.delete(taskId);
			}
		}

		// On effect cleanup (deps changed or unmount), unsubscribe from everything.
		return () => {
			for (const [, unsubscribe] of subscriptionsRef.current) {
				unsubscribe();
			}
			subscriptionsRef.current.clear();
		};
	}, [activeSessions, dispatch, t]);

	return null;
}
