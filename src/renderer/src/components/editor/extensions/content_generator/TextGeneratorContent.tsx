import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppTextarea } from '@components/app/AppTextarea';
import { AppButton } from '@components/app/AppButton';
import { AppCheckbox } from '@components/app/AppCheckbox';
import { ArrowUp, LoaderCircle } from 'lucide-react';
import type { ContentGeneratorMode } from './input-extension';
import { ModeDropdown } from './ModeDropdown';

export interface TextGeneratorContentProps {
	prompt: string;
	loading: boolean;
	enable: boolean;
	mode: ContentGeneratorMode;
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
	submitRef: React.RefObject<(() => void) | null>;
	onPromptChange: (value: string) => void;
	onResize: () => void;
	onModeChange: (mode: ContentGeneratorMode) => void;
}

export function TextGeneratorContent({
	prompt,
	loading,
	enable,
	mode,
	textareaRef,
	submitRef,
	onPromptChange,
	onResize,
	onModeChange,
}: TextGeneratorContentProps): React.JSX.Element {
	const { t } = useTranslation();

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
				className="min-h-[40px] resize-none border-none bg-transparent px-4 pt-3 pb-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
				placeholder={t('agentPrompt.placeholder')}
				rows={1}
			/>
			<div className="flex items-center justify-between px-3 pb-2">
				<ModeDropdown mode={mode} disabled={!enable} onModeChange={onModeChange} />
				<div className="flex items-center gap-3">
					<label className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<AppCheckbox className="h-3.5 w-3.5" disabled={!enable} />
						{t('agentPrompt.search')}
					</label>
					<label className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<AppCheckbox className="h-3.5 w-3.5" disabled={!enable} />
						{t('agentPrompt.rag')}
					</label>
					<AppButton
						variant="prompt-submit"
						size="prompt-submit-md"
						className="shrink-0"
						disabled={!enable || loading || !prompt.trim()}
						onMouseDown={(e) => {
							e.preventDefault();
							if (!loading) submitRef.current?.();
						}}
					>
						{loading ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
					</AppButton>
				</div>
			</div>
		</>
	);
}
