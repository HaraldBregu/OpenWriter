import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MessageCircle, Loader2, Send } from 'lucide-react';
import { store } from '@/store';
import { taskAdded } from '@/store/tasks/actions';
import { subscribeToTask } from '../../services/task-event-bus';
import type { TaskSnapshot } from '../../services/task-event-bus';
import type { ChatMessage } from './debug-constants';

export function ChatBotTab() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState('');
	const [streaming, setStreaming] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const handleSubmit = useCallback(
		async (e?: React.FormEvent) => {
			e?.preventDefault();
			const text = input.trim();
			if (!text || streaming) return;

			setInput('');
			setMessages((prev) => [...prev, { role: 'user', content: text }]);
			setStreaming(true);

			const assistantIdx = messages.length + 1;
			setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

			try {
				const result = await window.task.submit(
					'agent-demo-agent',
					{ prompt: text },
					{ priority: 'normal' }
				);

				if (result.success && result.data?.taskId) {
					store.dispatch(taskAdded({ taskId: result.data.taskId, type: 'agent-demo-agent' }));

					const unsub = subscribeToTask(result.data.taskId, (snap: TaskSnapshot) => {
						if (snap.content) {
							setMessages((prev) => {
								const updated = [...prev];
								updated[assistantIdx] = { role: 'assistant', content: snap.content };
								return updated;
							});
						}
						if (
							snap.status === 'completed' ||
							snap.status === 'error' ||
							snap.status === 'cancelled'
						) {
							setStreaming(false);
							unsub();
							if (snap.status === 'error') {
								setMessages((prev) => {
									const updated = [...prev];
									updated[assistantIdx] = {
										role: 'assistant',
										content: snap.error ?? 'An error occurred.',
									};
									return updated;
								});
							}
						}
					});
				} else {
					setStreaming(false);
					setMessages((prev) => {
						const updated = [...prev];
						updated[assistantIdx] = { role: 'assistant', content: 'Failed to submit task.' };
						return updated;
					});
				}
			} catch {
				setStreaming(false);
				setMessages((prev) => {
					const updated = [...prev];
					updated[assistantIdx] = { role: 'assistant', content: 'Failed to submit task.' };
					return updated;
				});
			}
		},
		[input, streaming, messages.length]
	);

	return (
		<div className="flex flex-col flex-1 min-h-0">
			<div className="flex-1 overflow-y-auto p-6">
				{messages.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
						<MessageCircle className="h-10 w-10 opacity-20" />
						<p className="text-sm">No messages yet</p>
						<p className="text-xs opacity-60">Send a message to start chatting</p>
					</div>
				) : (
					<div className="max-w-3xl mx-auto space-y-4">
						{messages.map((msg, i) => (
							<div
								key={i}
								className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
							>
								<div
									className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap ${
										msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
									}`}
								>
									{msg.content || (
										<span className="inline-flex items-center gap-1 text-muted-foreground">
											<Loader2 className="h-3 w-3 animate-spin" />
											Thinking...
										</span>
									)}
								</div>
							</div>
						))}
						<div ref={messagesEndRef} />
					</div>
				)}
			</div>

			<div className="border-t px-6 py-3 shrink-0">
				<form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-3xl mx-auto">
					<input
						ref={inputRef}
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						disabled={streaming}
						placeholder="Type a message..."
						className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
					/>
					<button
						type="submit"
						disabled={!input.trim() || streaming}
						className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
					>
						<Send className="h-4 w-4" />
					</button>
				</form>
			</div>
		</div>
	);
}
