import React from 'react';
import { ChevronRight } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
	readonly id: string;
	readonly content: string;
	readonly role: 'user' | 'assistant';
	readonly timestamp: Date | string;
	readonly status?: 'idle' | 'queued' | 'running' | 'completed' | 'error' | 'cancelled';
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
	status,
	renderMarkdown = false,
}) => {
	const isUser = role === 'user';
	const isThinking =
		!isUser &&
		!content.trim() &&
		(status === 'idle' || status === 'queued' || status === 'running');

	if (isUser) {
		return (
			<div className="flex flex-col gap-1.5">
				<div className="rounded-2xl border border-border/70 bg-muted/70 px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
					<div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
						{content}
					</div>
				</div>
				<span className="px-1 text-[10px] text-muted-foreground">{formatTime(timestamp)}</span>
			</div>
		);
	}

	return (
		<div className="flex gap-4">
			<div className="mt-2 flex w-5 shrink-0 flex-col items-center">
				<span className="h-3.5 w-3.5 rounded-full bg-muted-foreground/80" />
				<span className="mt-1 h-full min-h-3 w-px bg-border/80" />
			</div>
			<div className="min-w-0 flex-1">
				{isThinking && (
					<div className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
						<span>Thinking</span>
						<ChevronRight className="h-3.5 w-3.5" />
					</div>
				)}
				{content.trim() && (
					<>
						{renderMarkdown ? (
							<div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-0 prose-headings:mb-2 prose-headings:mt-0 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-pre:my-2 prose-pre:overflow-x-auto prose-pre:rounded-lg prose-pre:bg-background/80 prose-code:rounded prose-code:bg-background/60 prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.8125rem] prose-code:before:content-none prose-code:after:content-none prose-a:text-foreground prose-a:underline prose-strong:text-foreground prose-blockquote:border-l-border prose-blockquote:text-muted-foreground text-sm leading-relaxed">
								<Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
							</div>
						) : (
							<div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
								{content}
							</div>
						)}
					</>
				)}
				<div className="mt-1 px-1 text-[10px] text-muted-foreground">{formatTime(timestamp)}</div>
			</div>
		</div>
	);
};

export { ChatMessage };
export type { ChatMessageProps };
