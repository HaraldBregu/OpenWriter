import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppTextarea } from '@components/app/AppTextarea';
import { AppButton } from '@components/app/AppButton';
import { ArrowUp, LoaderCircle } from 'lucide-react';

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

	return (
		<>
			<div className="flex items-center px-4 pb-1 pt-1 text-xs font-medium text-muted-foreground">
				<span className="rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-[11px] tracking-[0.01em] shadow-sm">
					{t('agenticPanel.systemMessage', 'Understanding request...')}
				</span>
			</div>
			<AppTextarea
				ref={textareaRef}
				value={prompt}
				onChange={(e) => {
					onPromptChange(e.target.value);
					onResize();
				}}
				disabled={!enable}
				className="min-h-[40px] resize-none border-none bg-transparent px-4 pt-2 pb-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
				placeholder={t(
					'agenticPanel.inputPlaceholder',
					'Write your request here'
				)}
				rows={1}
			/>
			<div className="flex items-center justify-end px-3 pb-2">
				<AppButton
					variant="prompt-submit"
					size="prompt-submit-md"
					className="shrink-0"
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
