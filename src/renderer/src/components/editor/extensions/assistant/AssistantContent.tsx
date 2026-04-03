import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppTextarea } from '@components/app/AppTextarea';
import { AppButton } from '@components/app/AppButton';
import { ArrowUp, LoaderCircle, Sparkles } from 'lucide-react';

export interface AssistantContentProps {
	prompt: string;
	loading: boolean;
	enable: boolean;
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
	submitRef: React.RefObject<(() => void) | null>;
	onPromptChange: (value: string) => void;
	onResize: () => void;
}

export function AssistantContent({
	prompt,
	loading,
	enable,
	textareaRef,
	submitRef,
	onPromptChange,
	onResize,
}: AssistantContentProps): React.JSX.Element {
	const { t } = useTranslation();
	const headerTitle = t('agenticPanel.emptyTitle', 'Ask the assistant');
	const description = t(
		'assistantNode.description',
		'Describe what should happen at this point in the document.'
	);
	const footerHint = loading
		? t('assistantNode.generating', 'Generating response...')
		: enable
			? t('assistantNode.shortcutHint', 'Enter to send. Shift+Enter adds a new line.')
			: t('assistantNode.disabled', 'Assistant unavailable right now.');

	return (
		<>
			<div className="px-4 pt-3 pb-2">
				<div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
					<Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
					{headerTitle}
				</div>
				<p className="mt-2 max-w-xl text-xs leading-5 text-foreground/70 dark:text-muted-foreground/90">
					{description}
				</p>
			</div>
			<AppTextarea
				ref={textareaRef}
				value={prompt}
				onChange={(e) => {
					onPromptChange(e.target.value);
					onResize();
				}}
				disabled={!enable}
				className="min-h-[88px] w-full resize-none border-none bg-transparent px-4 pt-1 pb-3 text-sm leading-6 text-foreground placeholder:text-foreground/45 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60 dark:placeholder:text-muted-foreground/75"
				placeholder={t(
					'assistantNode.placeholder',
					'Ask the assistant to continue, rewrite, or generate from here.'
				)}
				rows={1}
			/>
			<div className="flex items-center justify-between gap-3 border-t border-border/70 bg-muted/45 px-3.5 py-2.5 dark:border-border/80 dark:bg-muted/20">
				<span className="text-[11px] font-medium text-foreground/65 dark:text-muted-foreground/95">
					{footerHint}
				</span>
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
