import React from 'react';
import { LoaderCircle } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageProps {
	readonly id: string;
	readonly content: string;
	readonly role: 'user' | 'assistant' | 'system';
	readonly taskId?: string | null;
	readonly timestamp: Date | string;
	readonly status?: 'idle' | 'queued' | 'running' | 'completed' | 'error' | 'cancelled';
	readonly renderMarkdown?: boolean;
	readonly showStatusLoader?: boolean;
}

const Message: React.FC<MessageProps> = ({
	content,
	role,
	timestamp: _timestamp,
	status,
	renderMarkdown = false,
	showStatusLoader = false,
}) => {
	const isUser = role === 'user';
	const isSystem = role === 'system';
	const shouldShowStatusLoader = showStatusLoader && status !== 'completed';

	if (isUser) {
		return (
			<div className="rounded-2xl border border-border/70 bg-accent/45 px-3.5 py-2 shadow-none sm:px-4 sm:py-2.5 dark:border-border/90 dark:bg-accent/90">
				<div className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-foreground/80 dark:text-foreground/95">
					{content}
				</div>
			</div>
		);
	}

	if (isSystem) {
		return (
			<div className="flex gap-2.5">
				<div className="min-w-0 flex-1">
					<div className="inline-flex items-center gap-1.5 rounded-full bg-transparent px-2 py-1 text-xs text-muted-foreground/90 dark:bg-accent/80 dark:text-muted-foreground/95">
						{shouldShowStatusLoader && (
							<LoaderCircle
								data-testid="status-loader"
								className="h-3.5 w-3.5 animate-spin"
							/>
						)}
						<span>{content}</span>
					</div>
				</div>
			</div>
		);
	}

	if (!content.trim()) {
		return null;
	}

	return (
		<div className="flex gap-2.5">
			<div className="min-w-0 flex-1">
				<div className="rounded-2xl border border-transparent bg-card/65 px-0 py-2.5 shadow-none dark:border-border/70 dark:bg-card/90 sm:py-3">
					{renderMarkdown ? (
						<div className="prose prose-sm max-w-none text-[13px] leading-6 text-foreground/80 dark:prose-invert dark:text-foreground/90 prose-p:my-1.5 prose-p:leading-6 prose-p:text-foreground/80 dark:prose-p:text-foreground/90 prose-headings:mb-1.5 prose-headings:mt-3 prose-headings:leading-snug prose-headings:text-foreground prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-li:text-foreground/75 dark:prose-li:text-foreground/85 prose-pre:my-2 prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:border prose-pre:border-border/60 prose-pre:bg-muted/80 prose-pre:p-3 dark:prose-pre:border-border/80 dark:prose-pre:bg-background/90 prose-code:rounded prose-code:bg-accent/70 prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.75rem] prose-code:text-foreground/90 dark:prose-code:bg-accent/80 dark:prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none prose-a:text-foreground prose-a:underline prose-strong:text-foreground prose-blockquote:my-2 prose-blockquote:border-l-border prose-blockquote:pl-3 prose-blockquote:text-foreground/70 dark:prose-blockquote:text-foreground/80 prose-hr:my-3">
							<Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
						</div>
					) : (
						<div className="whitespace-pre-wrap text-[13px] leading-6 text-foreground/80 dark:text-foreground/90">
							{content}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export { Message };
export type { MessageProps };
