import React, { useMemo, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
	readonly id: string;
	readonly content: string;
	readonly role: 'user' | 'assistant';
	readonly timestamp: Date | string;
	readonly renderMarkdown?: boolean;
}

function formatTime(timestamp: Date | string): string {
	const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
	return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const ChatMessage: React.FC<ChatMessageProps> = ({
	content,
	role,
	timestamp,
	renderMarkdown = false,
}) => {
	const isUser = role === 'user';
	const [expanded, setExpanded] = useState(false);
	const isLongMessage = useMemo(() => {
		const lineCount = content.split('\n').length;
		return content.length > 520 || lineCount > 8;
	}, [content]);
	const shouldCollapse = isLongMessage && !expanded;

	return (
		<div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
			<div
				className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed break-words ${
					isUser
						? 'bg-primary text-primary-foreground rounded-tr-sm'
						: 'bg-muted text-foreground rounded-tl-sm'
				}`}
			>
				<div className={`relative ${shouldCollapse ? 'max-h-48 overflow-hidden' : ''}`}>
					{renderMarkdown ? (
						<div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-0 prose-headings:mb-2 prose-headings:mt-0 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-pre:my-2 prose-pre:overflow-x-auto prose-pre:rounded-lg prose-pre:bg-background/80 prose-code:rounded prose-code:bg-background/60 prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.8125rem] prose-code:before:content-none prose-code:after:content-none prose-a:text-foreground prose-a:underline prose-strong:text-foreground prose-blockquote:border-l-border prose-blockquote:text-muted-foreground">
							<Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
						</div>
					) : (
						<div className="whitespace-pre-wrap">{content}</div>
					)}
					{shouldCollapse && (
						<div
							className={`pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t ${
								isUser ? 'from-primary to-transparent' : 'from-muted to-transparent'
							}`}
						/>
					)}
				</div>
				{isLongMessage && (
					<button
						type="button"
						className="mt-2 text-xs font-medium underline underline-offset-2"
						onClick={() => setExpanded((prev) => !prev)}
					>
						{expanded ? 'Show less' : 'Show more'}
					</button>
				)}
			</div>
			<span className="text-[10px] text-muted-foreground px-1">{formatTime(timestamp)}</span>
		</div>
	);
};

export { ChatMessage };
export type { ChatMessageProps };
