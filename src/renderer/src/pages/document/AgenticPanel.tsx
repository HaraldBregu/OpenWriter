import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot } from 'lucide-react';
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from '@/components/app';
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
		<div className="flex flex-col border-l border-border bg-muted/30 overflow-hidden w-full h-full">
			<AppCard className="w-full flex flex-col flex-1 min-h-0 bg-transparent shadow-none border-none rounded-none">
				<AppCardHeader className="p-4 pb-2 shrink-0">
					<AppCardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground/70">
						<Bot className="h-3.5 w-3.5" aria-hidden="true" />
						{t('agenticSidebar.title', 'Writing Assistant')}
					</AppCardTitle>
				</AppCardHeader>

				<AppCardContent className="flex-1 min-h-0 p-0 flex flex-col">
					<div className="flex-1 overflow-y-auto px-4 py-2">
						<div className="flex flex-col gap-3">
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

					<ChatInput onSend={handleSend} />
				</AppCardContent>
			</AppCard>
		</div>
	);
};

export default AgenticLayout;
