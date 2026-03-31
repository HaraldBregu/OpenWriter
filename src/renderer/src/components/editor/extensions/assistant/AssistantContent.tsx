import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppTextarea } from '@components/app/AppTextarea';
import { AppButton } from '@components/app/AppButton';
import { ArrowUp, Bot, LoaderCircle } from 'lucide-react';

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
			<div className="flex items-center gap-2 px-4 pt-2 text-xs font-medium text-muted-foreground">
				<span className="flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--info)/0.14)] text-[hsl(var(--info))] shadow-[inset_0_0_0_1px_hsl(var(--info)/0.18)]">
					<Bot className="h-3.5 w-3.5" />
				</span>
				<div className="flex flex-col">
					<span className="leading-none">{t('agenticPanel.assistantLabel', 'Assistant')}</span>
					<span className="mt-0.5 text-[10px] font-normal text-muted-foreground/80">
						{t('agenticPanel.assistantHint', 'AI guided response')}
					</span>
				</div>
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
					'Ask the assistant for help with writing, research, editing, or image prompts'
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
