import React from 'react';

interface ChatMessageProps {
	readonly id: string;
	readonly content: string;
	readonly role: 'user' | 'assistant';
	readonly timestamp: Date;
}

function formatTime(date: Date): string {
	return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const ChatMessage: React.FC<ChatMessageProps> = ({ content, role, timestamp }) => {
	const isUser = role === 'user';

	return (
		<div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
			<div
				className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed break-words ${
					isUser
						? 'bg-primary text-primary-foreground rounded-tr-sm'
						: 'bg-muted text-foreground rounded-tl-sm'
				}`}
			>
				{content}
			</div>
			<span className="text-[10px] text-muted-foreground px-1">{formatTime(timestamp)}</span>
		</div>
	);
};

export { ChatMessage };
export type { ChatMessageProps };
