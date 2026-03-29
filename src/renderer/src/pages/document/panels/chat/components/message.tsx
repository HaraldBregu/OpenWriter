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
			<div className="rounded-xl border border-border/80 bg-muted/40 px-3.5 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.22)] sm:px-4 sm:py-2.5">
				<div className="whitespace-pre-wrap text-xs font-medium leading-relaxed text-foreground/80">
					{content}
				</div>
			</div>
		);
	}

	if (isSystem) {
		return (
			<div className="flex gap-2.5">
				<div className="min-w-0 flex-1">
					<div className="inline-flex items-center gap-1.5 px-0.5 text-xs text-muted-foreground/90">
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
				<div className="rounded-xl bg-background/70 px-0 py-2 sm:py-2.5">
					{renderMarkdown ? (
						<div className="prose prose-sm max-w-none text-[13px] leading-6 text-muted-foreground dark:prose-invert prose-p:my-1.5 prose-p:leading-6 prose-p:text-muted-foreground prose-headings:mb-1.5 prose-headings:mt-3 prose-headings:leading-snug prose-headings:text-foreground/85 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-li:text-muted-foreground prose-pre:my-2 prose-pre:overflow-x-auto prose-pre:rounded-lg prose-pre:border prose-pre:border-border/60 prose-pre:bg-black/20 prose-pre:p-3 prose-code:rounded prose-code:bg-background/60 prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.75rem] prose-code:text-foreground/85 prose-code:before:content-none prose-code:after:content-none prose-a:text-foreground/90 prose-a:underline prose-strong:text-foreground/90 prose-blockquote:my-2 prose-blockquote:border-l-border prose-blockquote:pl-3 prose-blockquote:text-muted-foreground prose-hr:my-3">
							<Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
						</div>
					) : (
						<div className="whitespace-pre-wrap text-[13px] leading-6 text-muted-foreground">
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
