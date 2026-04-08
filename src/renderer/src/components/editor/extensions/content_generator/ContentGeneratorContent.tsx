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
	onRemoveFile,
	onFileInputChange,
	onOpenFilePicker,
	onResize,
}: ContentGeneratorContentProps): React.JSX.Element {
	const { t } = useTranslation();
	const isImage = agentId === 'image';

	const footerHint = loading
		? t('assistantNode.generating', 'Generating response...')
		: !enable
			? t('assistantNode.disabled', 'Assistant unavailable right now.')
			: t('assistantNode.keyboardHint', 'Enter to send  ·  Esc to dismiss');

	const isSubmitDisabled =
		!enable || loading || (!prompt.trim() && (!isImage || files.length === 0));

	return (
		<>
			{isImage && (
				<ImageAttachmentBar
					files={files}
					previewUrls={previewUrls}
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
				className={cn(
					'min-h-[92px] w-full resize-none border-none bg-transparent px-4 pt-4 pb-3 text-sm leading-6 text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
					'placeholder:text-foreground/42 dark:placeholder:text-muted-foreground/70',
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
				hint={footerHint}
				loading={loading}
				isSubmitDisabled={isSubmitDisabled}
				submitRef={submitRef}
				onAgentChange={onAgentChange}
				onImageModelChange={onImageModelChange}
			/>
		</>
	);
}
