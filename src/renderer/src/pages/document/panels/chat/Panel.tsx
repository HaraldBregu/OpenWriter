import React, { useRef, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import type { Editor as TiptapEditor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { v7 as uuidv7 } from 'uuid';
import { getTaskStatusText, type TaskEvent, type TaskState } from '../../../../../../shared/types';
import { useDocumentState, useEditorInstance } from '../../hooks';

interface TaskSnapshot {
	status: TaskState;
	content: string;
	error?: string;
	result?: unknown;
	metadata?: Record<string, unknown>;
}

function dataField<T>(data: unknown, key: string): T | undefined {
	if (typeof data === 'object' && data !== null && key in data) {
		return (data as Record<string, unknown>)[key] as T;
	}
	return undefined;
}

function applyTaskEventToSnapshot(prev: TaskSnapshot, event: TaskEvent): TaskSnapshot {
	const metadata = event.metadata ?? prev.metadata;
	switch (event.state) {
		case 'queued':
		case 'started':
			return { ...prev, status: event.state, metadata };
		case 'running': {
			const streamData = dataField<string>(event.data, 'data');
			if (typeof streamData === 'string' && streamData.length > 0) {
				return {
					...prev,
					status: 'running',
					content: prev.content + streamData,
					metadata,
				};
			}
			return { ...prev, status: 'running', metadata };
		}
		case 'finished':
			return {
				...prev,
				status: 'finished',
				result: dataField<unknown>(event.data, 'result'),
				metadata,
			};
		case 'cancelled': {
			const errorMessage = typeof event.data === 'string' && event.data.length > 0
				? event.data
				: undefined;
			return { ...prev, status: 'cancelled', error: errorMessage, metadata };
		}
		default:
			return prev;
	}
}

interface EditorSelection {
	readonly from: number;
	readonly to: number;
}

function useEditorSelection(editor: TiptapEditor | null): EditorSelection | null {
	const snapshotRef = useRef<EditorSelection | null>(null);

	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			if (!editor || editor.isDestroyed) return () => {};
			const update = (): void => {
				const { from, to } = editor.state.selection;
				const prev = snapshotRef.current;
				if (prev && prev.from === from && prev.to === to) return;
				snapshotRef.current = { from, to };
				onStoreChange();
			};
			update();
			editor.on('selectionUpdate', update);
			return () => {
				editor.off('selectionUpdate', update);
				snapshotRef.current = null;
				onStoreChange();
			};
		},
		[editor]
	);

	return useSyncExternalStore(
		subscribe,
		() => snapshotRef.current,
		() => null
	);
}
import { useChatState, useChatDispatch, useChatPersistence } from './hooks';
import { ChatProvider } from './Provider';
import { buildTaskPrompt, getSelectedEditorText, mapTaskStatusToChatStatus } from './shared';
import type { AssistantTaskData } from './shared';
import { Card } from '@/components/ui/Card';
import { PanelHeader } from './PanelHeader';
import { PanelFooter } from './PanelFooter';
import { PanelBody } from './PanelBody';

const Chat: React.FC = () => {
	const { t } = useTranslation();
	const dispatch = useChatDispatch();
	const { documentId } = useDocumentState();
	const { editor } = useEditorInstance();
	const selection = useEditorSelection(editor);
	const { messages: chatMessages, sessionId, activeTaskId, activeMessageId } = useChatState();
	const messagesRef = useRef(chatMessages);
	const lastRecordedTaskStateRef = useRef<string | null>(null);
	const isRunning = activeMessageId !== null || activeTaskId !== null;
	const hasSelectionRange = !!selection && selection.from !== selection.to;

	const selectionLabel = useMemo(() => {
		if (!selection || selection.from === selection.to) return null;
		return `Selection ${selection.from}-${selection.to}`;
	}, [selection]);

	const handleClearSelection = useCallback(() => {
		if (!editor || editor.isDestroyed || !selection || selection.from === selection.to) return;

		const docSize = editor.state.doc.content.size;
		const collapsePos = Math.max(0, Math.min(selection.to, docSize));
		const nextSelection = TextSelection.near(editor.state.doc.resolve(collapsePos), -1);
		const tr = editor.state.tr.setSelection(nextSelection).scrollIntoView();
		editor.view.dispatch(tr);
		editor.view.focus();
	}, [editor, selection]);

	messagesRef.current = chatMessages;

	useEffect(() => {
		if (!documentId || !activeTaskId || !activeMessageId) return;
		if (typeof window.task?.onEvent !== 'function') return;

		lastRecordedTaskStateRef.current = null;

		let snapshot: TaskSnapshot = {
			status: 'queued',
			content: '',
		};

		const unsubscribe = window.task.onEvent((event: TaskEvent) => {
			if (event.taskId !== activeTaskId) return;

			snapshot = applyTaskEventToSnapshot(snapshot, event);

			const metadataDocumentId = snapshot.metadata?.documentId;
			const targetDocumentId =
				typeof metadataDocumentId === 'string' && metadataDocumentId.length > 0
					? metadataDocumentId
					: documentId;

			if (targetDocumentId !== documentId) return;
			const taskStatusText = getTaskStatusText(snapshot.metadata);

			if (taskStatusText) {
				const chatStatus = mapTaskStatusToChatStatus(snapshot.status);
				const dedupeKey = `${snapshot.status}:${taskStatusText}`;
				const alreadyRecorded = messagesRef.current.some(
					(message) =>
						message.role === 'system' &&
						message.taskId === activeTaskId &&
						message.content === taskStatusText &&
						message.status === chatStatus
				);

				if (alreadyRecorded) {
					lastRecordedTaskStateRef.current = dedupeKey;
				} else if (lastRecordedTaskStateRef.current !== dedupeKey) {
					lastRecordedTaskStateRef.current = dedupeKey;
					dispatch({
						type: 'CHAT_MESSAGE_INSERTED_BEFORE',
						beforeId: activeMessageId,
						message: {
							id: crypto.randomUUID(),
							content: taskStatusText,
							role: 'system',
							timestamp: new Date().toISOString(),
							taskId: activeTaskId,
							status: chatStatus,
						},
					});
				}
			}

			switch (snapshot.status) {
				case 'queued':
				case 'started':
					dispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: activeMessageId,
						patch: {
							taskId: activeTaskId,
							status: 'queued',
						},
					});
					break;
				case 'running':
					dispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: activeMessageId,
						patch: {
							taskId: activeTaskId,
							status: 'running',
							...(snapshot.content ? { content: snapshot.content } : {}),
						},
					});
					break;
				case 'completed': {
					const output = snapshot.result as { content?: string } | undefined;
					dispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: activeMessageId,
						patch: {
							content:
								output?.content ||
								snapshot.content ||
								t('agenticPanel.emptyResponse', 'No response received.'),
							taskId: activeTaskId,
							status: 'completed',
						},
					});
					lastRecordedTaskStateRef.current = null;
					dispatch({ type: 'CHAT_ACTIVE_TASK_SET', taskId: null });
					dispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: null });
					break;
				}
				case 'error':
					dispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: activeMessageId,
						patch: {
							content:
								snapshot.error || t('agenticPanel.error', 'The assistant failed to respond.'),
							taskId: activeTaskId,
							status: 'error',
						},
					});
					lastRecordedTaskStateRef.current = null;
					dispatch({ type: 'CHAT_ACTIVE_TASK_SET', taskId: null });
					dispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: null });
					break;
				case 'cancelled':
					dispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: activeMessageId,
						patch: {
							content: t('agenticPanel.cancelled', 'The assistant request was cancelled.'),
							taskId: activeTaskId,
							status: 'cancelled',
						},
					});
					lastRecordedTaskStateRef.current = null;
					dispatch({ type: 'CHAT_ACTIVE_TASK_SET', taskId: null });
					dispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: null });
					break;
				default:
					break;
			}
		});

		return () => {
			lastRecordedTaskStateRef.current = null;
			unsubscribe();
		};
	}, [activeMessageId, activeTaskId, dispatch, documentId, t]);

	const handleSend = useCallback(
		async (content: string) => {
			if (!documentId || isRunning) return;

			const resolvedSessionId = sessionId ?? uuidv7();
			const selectedText = getSelectedEditorText(editor, selection);
			const taskPrompt = buildTaskPrompt(content, selectedText);

			if (!sessionId) {
				dispatch({ type: 'CHAT_SESSION_STARTED', sessionId: resolvedSessionId });
			}

			const userMessageId = crypto.randomUUID();
			const assistantMessageId = crypto.randomUUID();
			const timestamp = new Date().toISOString();

			dispatch({
				type: 'CHAT_MESSAGE_ADDED',
				message: {
					id: userMessageId,
					content,
					role: 'user',
					timestamp,
					taskId: null,
					status: 'completed',
				},
			});

			dispatch({
				type: 'CHAT_MESSAGE_ADDED',
				message: {
					id: assistantMessageId,
					content: '',
					role: 'assistant',
					timestamp,
					taskId: null,
					status: 'idle',
				},
			});

			dispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: assistantMessageId });
			dispatch({ type: 'CHAT_ACTIVE_TASK_SET', taskId: null });

			const taskType = 'agent-text';
			const taskInput: AssistantTaskData = { prompt: taskPrompt };
			const metadata = {
				agentId: 'text',
				...(documentId ? { documentId } : {}),
				...(resolvedSessionId ? { chatId: resolvedSessionId } : {}),
			};

			if (typeof window.task?.submit !== 'function') {
				dispatch({
					type: 'CHAT_MESSAGE_UPDATED',
					id: assistantMessageId,
					patch: {
						content: t('agenticPanel.error', 'The assistant failed to respond.'),
						status: 'error',
					},
				});
				dispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: null });
				return;
			}

			try {
				const ipcResult = await window.task.submit({
					type: taskType,
					input: taskInput,
					metadata,
				});

				if (!ipcResult.success) {
					dispatch({
						type: 'CHAT_MESSAGE_UPDATED',
						id: assistantMessageId,
						patch: {
							content:
								ipcResult.error.message ||
								t('agenticPanel.error', 'The assistant failed to respond.'),
							status: 'error',
						},
					});
					dispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: null });
					return;
				}

				const resolvedTaskId = ipcResult.data.taskId;
				dispatch({ type: 'CHAT_ACTIVE_TASK_SET', taskId: resolvedTaskId });
				dispatch({
					type: 'CHAT_MESSAGE_UPDATED',
					id: assistantMessageId,
					patch: {
						taskId: resolvedTaskId,
						status: 'queued',
					},
				});
			} catch {
				dispatch({
					type: 'CHAT_MESSAGE_UPDATED',
					id: assistantMessageId,
					patch: {
						content: t('agenticPanel.error', 'The assistant failed to respond.'),
						status: 'error',
					},
				});
				dispatch({ type: 'CHAT_ACTIVE_MESSAGE_SET', messageId: null });
			}
		},
		[dispatch, documentId, editor, isRunning, selection, sessionId, t]
	);

	return (
		<Card className="flex h-full w-full flex-col border-none rounded-none bg-background p-0! gap-0!">
			<PanelHeader />
			<PanelBody />
			<PanelFooter
				onSend={handleSend}
				disabled={isRunning}
				selectionLabel={selectionLabel}
				canClearSelection={hasSelectionRange}
				onClearSelection={handleClearSelection}
				placeholder={t(
					'agenticPanel.inputPlaceholder',
					'Ask the assistant for help with writing, research, editing, or image prompts'
				)}
			/>
		</Card>
	);
};

const ChatPanel: React.FC = React.memo(() => {
	const { documentId } = useDocumentState();
	useChatPersistence(documentId);

	return (
		<ChatProvider>
			<Chat />
		</ChatProvider>
	);
});
ChatPanel.displayName = 'ChatPanel';

export default ChatPanel;
