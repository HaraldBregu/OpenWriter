import React from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus, Sparkles } from 'lucide-react';
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
	selectedWritingModel: ModelInfo;
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	submitRef: React.RefObject<(() => void) | null>;
	onPromptChange: (value: string) => void;
	onAgentChange: (agentId: ContentGeneratorAgentId) => void;
	onImageModelChange: (model: ModelInfo) => void;
	onWritingModelChange: (model: ModelInfo) => void;
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
	selectedWritingModel,
	textareaRef,
	fileInputRef,
	submitRef,
	onPromptChange,
	onAgentChange,
	onImageModelChange,
	onWritingModelChange,
	onRemoveFile,
	onFileInputChange,
	onOpenFilePicker,
	onResize,
}: ContentGeneratorContentProps): React.JSX.Element {
	const { t } = useTranslation();
	const isImage = agentId === 'image';
	const hintId = React.useId();
	const activeModel = isImage ? selectedImageModel : selectedWritingModel;
	const modeTitle = isImage
		? t('assistantNode.imageTitle', 'Generate image')
		: t('assistantNode.writerTitle', 'Generate text');
	const modeDescription = isImage
		? t(
				'assistantNode.imageDescription',
				'Use a prompt and optional references to create a new image without leaving the document.'
			)
		: t(
				'assistantNode.writerDescription',
				'Continue the draft, rewrite a passage, or generate new copy directly in place.'
			);

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
			<div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4">
				<div className="flex min-w-0 items-start gap-3">
					<div
						className={cn(
							'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-[0_1px_0_hsl(var(--background)/0.95)_inset,0_8px_20px_hsl(var(--foreground)/0.06)]',
							isImage
								? 'border-primary/20 bg-primary/10 text-primary'
								: 'border-border/70 bg-background/78 text-foreground dark:border-white/12 dark:bg-white/[0.05]'
						)}
					>
						{isImage ? <ImagePlus className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
					</div>
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<p className="text-sm font-semibold text-foreground">{modeTitle}</p>
							<span className="inline-flex items-center rounded-full border border-border/70 bg-background/78 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:border-white/12 dark:bg-white/[0.04] dark:text-muted-foreground/95">
								{activeModel.provider}
							</span>
						</div>
						<p className="mt-1 max-w-[38rem] text-xs leading-5 text-muted-foreground dark:text-muted-foreground/95">
							{modeDescription}
						</p>
					</div>
				</div>
				<div className="hidden min-w-0 max-w-[15rem] shrink-0 rounded-full border border-border/70 bg-background/72 px-3 py-1.5 text-right text-[11px] font-medium text-muted-foreground shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_4px_10px_hsl(var(--foreground)/0.04)] dark:border-white/12 dark:bg-white/[0.04] dark:text-muted-foreground/95 sm:block">
					<div className="truncate text-foreground dark:text-foreground">{activeModel.name}</div>
				</div>
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
				aria-label={modeTitle}
				aria-describedby={hintId}
				className={cn(
					'min-h-[108px] w-full resize-none border-none bg-transparent px-4 pt-3 pb-3 text-[15px] leading-7 text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
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
				selectedWritingModel={selectedWritingModel}
				hint={footerHint}
				hintId={hintId}
				hintTone={footerHintTone}
				loading={loading}
				isSubmitDisabled={isSubmitDisabled}
				submitRef={submitRef}
				onAgentChange={onAgentChange}
				onImageModelChange={onImageModelChange}
				onWritingModelChange={onWritingModelChange}
			/>
		</>
	);
}
