import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';

interface ChatMessageData {
	id: string;
	content: string;
	role: 'user' | 'assistant';
	timestamp: Date;
}

const DEMO_MESSAGES: ChatMessageData[] = [
	{
		id: '1',
		content: 'Can you help me improve the opening paragraph of my essay?',
		role: 'user',
		timestamp: new Date(Date.now() - 4 * 60 * 1000),
	},
	{
		id: '2',
		content:
			"Of course! Share the paragraph and I'll suggest ways to make it more engaging and concise.",
		role: 'assistant',
		timestamp: new Date(Date.now() - 3 * 60 * 1000),
	},
	{
		id: '3',
		content: 'The essay is about the impact of technology on modern communication.',
		role: 'user',
		timestamp: new Date(Date.now() - 2 * 60 * 1000),
	},
	{
		id: '4',
		content:
			'Great topic! Try opening with a vivid anecdote or a striking statistic to hook the reader immediately, then introduce your thesis in the second sentence.',
		role: 'assistant',
		timestamp: new Date(Date.now() - 1 * 60 * 1000),
	},
];

const AgenticPanel: React.FC = () => {
	const { t } = useTranslation();
	const [messages, setMessages] = useState<ChatMessageData[]>(DEMO_MESSAGES);
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const handleSend = useCallback((content: string) => {
		const newMessage: ChatMessageData = {
			id: crypto.randomUUID(),
			content,
			role: 'user',
			timestamp: new Date(),
		};
		setMessages((prev) => [...prev, newMessage]);
	}, []);

	return (
		<div className="flex flex-col h-full w-full overflow-hidden border-l border-border bg-background">
			{/* Messages area — grows to fill available space */}
			<div
				className="flex-1 min-h-0 overflow-y-auto px-4 py-4"
				role="log"
				aria-label={t('agenticPanel.messagesRegion', 'Chat messages')}
				aria-live="polite"
			>
				<div className="flex flex-col gap-4">
					{messages.map((msg) => (
						<ChatMessage
							key={msg.id}
							id={msg.id}
							content={msg.content}
							role={msg.role}
							timestamp={msg.timestamp}
						/>
					))}
					<div ref={bottomRef} />
				</div>
			</div>

			{/* Floating input card anchored to bottom */}
			<ChatInput onSend={handleSend} />
		</div>
	);
};

export default AgenticPanel;
