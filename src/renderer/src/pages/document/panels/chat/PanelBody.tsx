import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, LoaderCircle } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatState } from './hooks';
import type { ChatMessageStatus, DocumentChatMessageRole } from './shared';

interface PanelBodyProps {
	readonly className?: string;
}

const PanelBody: React.FC<PanelBodyProps> = ({ className = '' }) => {
	const { t } = useTranslation();
	const { messages: chatMessages } = useChatState();
	const bottomRef = useRef<HTMLDivElement>(null);

	const latestSystemMessageId = [...chatMessages]
		.reverse()
		.find((entry) => entry.role === 'system')?.id;

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [chatMessages]);

	if (chatMessages.length === 0) {
		return (
			<div className={className}>
				<div className="flex h-full flex-col items-center justify-center px-6 text-center">
					<div className="flex max-w-xs flex-col items-center gap-3 rounded-[1.75rem] border border-dashed border-border/85 bg-card/82 px-6 py-8 shadow-none dark:border-border/90 dark:bg-card/75">
						<div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/82 dark:bg-accent/95">
							<Bot
								className="h-5 w-5 text-foreground/70 dark:text-foreground/95"
								aria-hidden="true"
							/>
						</div>
						<div className="space-y-1">
							<p className="text-sm font-medium text-foreground">
								{t('agenticPanel.emptyTitle', 'Ask the assistant')}
							</p>
							<p className="text-xs leading-5 text-foreground/68 dark:text-muted-foreground/90">
								{t(
									'agenticPanel.emptyDescription',
									'Use it for writing, editing, research, conversation, and image ideas.'
								)}
							</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={className}>
			<div className="flex flex-col">
				{chatMessages.map((message, index) => {
					const previousMessage = index > 0 ? chatMessages[index - 1] : null;
					const isGroupedWithPrevious =
						previousMessage !== null &&
						previousMessage.role !== 'user' &&
						message.role !== 'user';
					const isSystemGroupedWithPrevious =
						previousMessage !== null &&
						previousMessage.role === 'system' &&
						message.role === 'system';
					const showStatusLoader =
						message.role === 'system' &&
						message.id === latestSystemMessageId &&
						message.status !== 'completed';

					return (
						<div
							key={message.id}
							className={
								index === 0
									? undefined
									: isSystemGroupedWithPrevious
										? undefined
										: isGroupedWithPrevious
											? 'mt-2'
											: 'mt-4'
							}
						>
							<Message
								id={message.id}
								content={message.content}
								role={message.role}
								taskId={message.taskId}
								timestamp={message.timestamp}
								status={message.status}
								renderMarkdown={message.role === 'assistant'}
								showStatusLoader={showStatusLoader}
							/>
						</div>
					);
				})}
				<div ref={bottomRef} />
			</div>
		</div>
	);
};

interface MessageProps {
	readonly id: string;
	readonly content: string;
	readonly role: DocumentChatMessageRole;
	readonly taskId?: string | null;
	readonly timestamp: Date | string;
	readonly status?: ChatMessageStatus;
	readonly renderMarkdown?: boolean;
	readonly showStatusLoader?: boolean;
	readonly className?: string;
}

const Message: React.FC<MessageProps> = ({
	content,
	role,
	status,
	renderMarkdown = false,
	showStatusLoader = false,
	className = '',
}) => {
	const isUser = role === 'user';
	const isSystem = role === 'system';
	const shouldShowStatusLoader = showStatusLoader && status !== 'completed';

	if (isUser) {
		return (
			<div
				className={`rounded-xl border border-border/80 bg-accent/72 px-3.5 py-2 shadow-none sm:px-4 sm:py-2.5 dark:border-border/90 dark:bg-accent/90 ${className}`}
			>
				<div className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-foreground/90 dark:text-foreground/95">
					{content}
				</div>
			</div>
		);
	}

	if (isSystem) {
		return (
			<div className={`flex gap-2.5 ${className}`}>
				<div className="min-w-0 flex-1">
					<div className="inline-flex items-center gap-1.5 px-0.5 text-xs text-foreground/65 dark:text-muted-foreground/95">
						{shouldShowStatusLoader && (
							<LoaderCircle data-testid="status-loader" className="h-3.5 w-3.5 animate-spin" />
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
		<div className={`flex gap-2.5 ${className}`}>
			<div className="min-w-0 flex-1">
				<div className="rounded-2xl px-0 py-2.5 shadow-none sm:py-3">
					{renderMarkdown ? (
						<div className="prose prose-sm max-w-none text-[13px] leading-6 text-foreground/88 dark:prose-invert dark:text-foreground/90 prose-p:my-1.5 prose-p:leading-6 prose-p:text-foreground/88 dark:prose-p:text-foreground/90 prose-headings:mb-1.5 prose-headings:mt-7 prose-headings:leading-snug prose-headings:text-foreground prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-li:text-foreground/82 dark:prose-li:text-foreground/85 prose-pre:my-2 prose-pre:overflow-x-auto prose-pre:rounded-none prose-pre:border-0 prose-pre:bg-transparent prose-pre:p-0 dark:prose-pre:bg-transparent prose-code:rounded-none prose-code:bg-transparent prose-code:px-0 prose-code:py-0 prose-code:text-[0.75rem] prose-code:text-foreground/95 dark:prose-code:bg-transparent dark:prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none prose-a:text-foreground prose-a:underline prose-strong:text-foreground prose-blockquote:my-2 prose-blockquote:border-l-0 prose-blockquote:pl-0 prose-blockquote:text-foreground/76 dark:prose-blockquote:text-foreground/80 prose-hr:my-3">
							<Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
						</div>
					) : (
						<div className="whitespace-pre-wrap text-[13px] leading-6 text-foreground/88 dark:text-foreground/90">
							{content}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export { PanelBody, Message };
export type { PanelBodyProps, MessageProps };
