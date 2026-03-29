import React from 'react';
import { ChevronRight } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
	readonly id: string;
	readonly content: string;
	readonly stateMessage?: string;
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
	stateMessage,
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
	const visibleStateMessage = stateMessage?.trim() || (isThinking ? 'Thinking' : undefined);

	if (isUser) {
		return (
			<div className="rounded-xl border border-border/80 bg-muted/40 px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
				<div className="whitespace-pre-wrap text-xs font-medium leading-relaxed text-foreground/80">
					{content}
				</div>
			</div>
		);
	}

	return (
		<div className="flex gap-2.5">
			<div className="min-w-0 flex-1">
				<div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
					Assistant
				</div>
				{visibleStateMessage && (
					<div className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground/90">
						<span>{visibleStateMessage}</span>
						<ChevronRight className="h-3.5 w-3.5" />
					</div>
				)}
				{content.trim() && (
					<div className="rounded-xl bg-background/70 px-2.5 py-2">
						{renderMarkdown ? (
							<div className="prose prose-sm max-w-none text-[13px] leading-6 text-muted-foreground dark:prose-invert prose-p:my-2 prose-p:leading-6 prose-p:text-muted-foreground prose-headings:mb-2 prose-headings:mt-4 prose-headings:leading-snug prose-headings:text-foreground/85 prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-li:text-muted-foreground prose-pre:my-3 prose-pre:overflow-x-auto prose-pre:rounded-lg prose-pre:border prose-pre:border-border/60 prose-pre:bg-black/20 prose-pre:p-3 prose-code:rounded prose-code:bg-background/60 prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.75rem] prose-code:text-foreground/85 prose-code:before:content-none prose-code:after:content-none prose-a:text-foreground/90 prose-a:underline prose-strong:text-foreground/90 prose-blockquote:my-3 prose-blockquote:border-l-border prose-blockquote:pl-3 prose-blockquote:text-muted-foreground prose-hr:my-4">
								<Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
							</div>
						) : (
							<div className="whitespace-pre-wrap text-[13px] leading-6 text-muted-foreground">
								{content}
							</div>
						)}
					</div>
				)}
				<div className="mt-0.5 px-0.5 text-[9px] text-muted-foreground">
					{formatTime(timestamp)}
				</div>
			</div>
		</div>
	);
};

export { ChatMessage };
export type { ChatMessageProps };
