import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppTextarea } from '@components/app/AppTextarea';
import { AppButton } from '@components/app/AppButton';
import { ArrowUp, LoaderCircle } from 'lucide-react';
import { AgentDropdown } from './AgentDropdown';
import type { AssistantAgentId } from './agents';

export interface AssistantContentProps {
	prompt: string;
	agentId: AssistantAgentId;
	loading: boolean;
	enable: boolean;
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
	submitRef: React.RefObject<(() => void) | null>;
	onPromptChange: (value: string) => void;
	onAgentChange: (agentId: AssistantAgentId) => void;
	onResize: () => void;
}

export function AssistantContent({
	prompt,
	agentId,
	loading,
	enable,
	textareaRef,
	submitRef,
	onPromptChange,
	onAgentChange,
	onResize,
}: AssistantContentProps): React.JSX.Element {
	const { t } = useTranslation();
	const footerHint = loading
		? t('assistantNode.generating', 'Generating response...')
		: enable
			? t('assistantNode.shortcutHint', 'Enter to send. Shift+Enter adds a new line.')
			: t('assistantNode.disabled', 'Assistant unavailable right now.');

	return (
		<>
			<AppTextarea
				ref={textareaRef}
				value={prompt}
				onChange={(e) => {
					onPromptChange(e.target.value);
					onResize();
				}}
				disabled={!enable}
				className="min-h-[92px] w-full resize-none border-none bg-transparent px-4 pt-4 pb-3 text-sm leading-6 text-foreground placeholder:text-foreground/45 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60 dark:placeholder:text-muted-foreground/75"
				placeholder={t(
					'assistantNode.placeholder',
					'Ask the assistant to continue, rewrite, or generate from here.'
				)}
				rows={1}
			/>
			<div className="flex items-center justify-between gap-3 border-t border-border/70 bg-muted/45 px-3.5 py-2.5 dark:border-border/80 dark:bg-muted/20">
				<div className="flex min-w-0 items-center gap-2">
					<AgentDropdown
						agentId={agentId}
						disabled={!enable || loading}
						onAgentChange={onAgentChange}
					/>
					<span className="truncate text-[11px] font-medium text-foreground/65 dark:text-muted-foreground/95">
						{footerHint}
					</span>
				</div>
				<AppButton
					variant="prompt-submit"
					size="prompt-submit-md"
					className="h-7 w-7 shrink-0 rounded-full"
					disabled={!enable || loading || !prompt.trim()}
					onMouseDown={(e) => {
						e.preventDefault();
						if (!loading) submitRef.current?.();
					}}
					aria-label={t('agenticPanel.send', 'Send message')}
				>
					{loading ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
				</AppButton>
			</div>
		</>
	);
}
