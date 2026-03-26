import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';

interface ChatMessageData {
	id: string;
	content: string;
	role: 'user' | 'assistant';
	timestamp: Date;
}

const AgenticPanel: React.FC = () => {
	const { t } = useTranslation();
	const [messages, setMessages] = useState<ChatMessageData[]>([]);
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
				{messages.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
						<div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
							<Bot className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
						</div>
						<div className="space-y-1">
							<p className="text-sm font-medium text-foreground">
								{t('agenticPanel.emptyTitle', 'Start a conversation')}
							</p>
							<p className="text-xs text-muted-foreground">
								{t('agenticPanel.emptyDescription', 'Ask the assistant to help with your writing.')}
							</p>
						</div>
					</div>
				) : (
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
				)}
			</div>

			{/* Floating input card anchored to bottom */}
			<ChatInput onSend={handleSend} />
		</div>
	);
};

export default AgenticPanel;
