import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppTextarea } from '@components/app/AppTextarea';
import { cn } from '@/lib/utils';
import { ImageAttachmentBar, PromptFooter } from './components';
import type { ContentGeneratorAgentId } from './agents';
import type { ModelInfo } from '../../../../../../shared/types';

export interface ContentGeneratorContentProps {
	prompt: string;
	agentId: ContentGeneratorAgentId;
	files: File[];
	previewUrls: string[];
	isDragOver: boolean;
	loading: boolean;
	enable: boolean;
	selectedImageModel: ModelInfo;
	selectedTextModel: ModelInfo;
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	submitRef: React.RefObject<(() => void) | null>;
	onPromptChange: (value: string) => void;
	onAgentChange: (agentId: ContentGeneratorAgentId) => void;
	onImageModelChange: (model: ModelInfo) => void;
	onTextModelChange: (model: ModelInfo) => void;
	onRemoveFile: (index: number) => void;
	onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onOpenFilePicker: () => void;
	onResize: () => void;
}

export function ContentGeneratorContent({
	prompt,
	agentId,
	files,
	previewUrls,
	isDragOver,
	loading,
	enable,
	selectedImageModel,
	selectedTextModel,
	textareaRef,
	fileInputRef,
	submitRef,
	onPromptChange,
	onAgentChange,
	onImageModelChange,
	onTextModelChange,
	onRemoveFile,
	onFileInputChange,
	onOpenFilePicker,
	onResize,
}: ContentGeneratorContentProps): React.JSX.Element {
	const { t } = useTranslation();
	const isImage = agentId === 'image';
	const hintId = React.useId();
	const activeModel = isImage ? selectedImageModel : selectedTextModel;
	const modeLabel = isImage
		? t('assistantAgent.image', 'Image')
		: t('assistantAgent.writer', 'Text');
	const inputLabel = isImage
		? t('assistantNode.imageTitle', 'Generate image')
		: t('assistantNode.writerTitle', 'Generate text');

	const footerHint = loading
		? t('assistantNode.generating', 'Generating response...')
		: !enable
			? t('assistantNode.disabled', 'Assistant unavailable right now.')
			: t('assistantNode.keyboardHint', 'Enter to send  ·  Esc to dismiss');
	const footerHintTone = loading ? 'loading' : !enable ? 'disabled' : 'default';

	const isSubmitDisabled =
		!enable || loading || (!prompt.trim() && (!isImage || files.length === 0));

	return (
		<>
			<div className="flex min-h-12 items-center justify-between gap-3 px-4 pt-3 pb-1">
				<p className="truncate text-sm font-semibold leading-none text-foreground">{modeLabel}</p>
				<span className="max-w-[55%] truncate rounded-full border border-border/70 bg-background/76 px-2.5 py-1 text-[11px] font-medium leading-none text-muted-foreground shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_4px_10px_hsl(var(--foreground)/0.04)] dark:border-white/12 dark:bg-white/[0.04] dark:text-muted-foreground/95 dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_6px_14px_hsl(var(--background)/0.28)]">
					{activeModel.name}
				</span>
			</div>
			{isImage && (
				<ImageAttachmentBar
					files={files}
					previewUrls={previewUrls}
					isDragOver={isDragOver}
					disabled={!enable || loading}
					fileInputRef={fileInputRef}
					onOpenFilePicker={onOpenFilePicker}
					onRemoveFile={onRemoveFile}
					onFileInputChange={onFileInputChange}
				/>
			)}
			<AppTextarea
				ref={textareaRef}
				value={prompt}
				onChange={(e) => {
					onPromptChange(e.target.value);
					onResize();
				}}
				disabled={!enable}
				aria-label={inputLabel}
				aria-describedby={hintId}
				className={cn(
					'min-h-[108px] w-full resize-none border-none bg-transparent px-4 pt-2 pb-3 text-[15px] leading-7 text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
					'placeholder:text-foreground/42 dark:placeholder:text-muted-foreground/78',
					'disabled:cursor-not-allowed disabled:opacity-60'
				)}
				placeholder={
					isImage
						? t(
								'assistantNode.imagePlaceholder',
								'Describe the image you want to create. You can also drop reference images here.'
							)
						: t(
								'assistantNode.placeholder',
								'Ask the assistant to continue, rewrite, or generate from here.'
							)
				}
				rows={1}
			/>
			<PromptFooter
				agentId={agentId}
				selectedImageModel={selectedImageModel}
				selectedTextModel={selectedTextModel}
				hint={footerHint}
				hintId={hintId}
				hintTone={footerHintTone}
				loading={loading}
				isSubmitDisabled={isSubmitDisabled}
				submitRef={submitRef}
				onAgentChange={onAgentChange}
				onImageModelChange={onImageModelChange}
				onTextModelChange={onTextModelChange}
			/>
		</>
	);
}
