import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppTextarea } from '@components/app/AppTextarea';
import { cn } from '@/lib/utils';
import { ImageAttachmentBar, PromptFooter, PromptHeader } from './components';
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
	const activeModel = isImage ? selectedImageModel : selectedTextModel;
	const inputLabel = isImage
		? t('assistantNode.imageTitle', 'Generate image')
		: t('assistantNode.writerTitle', 'Generate text');

	const isSubmitDisabled =
		!enable || loading || (!prompt.trim() && (!isImage || files.length === 0));

	return (
		<>
			<PromptHeader agentId={agentId} modelName={activeModel.name} />
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
				className={cn(
					'min-h-[108px] w-full resize-none border-none bg-transparent px-4 pt-2 pb-3 text-[15px] leading-7 text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
					'placeholder:text-foreground/42 dark:placeholder:text-muted-foreground/78',
					'disabled:cursor-not-allowed disabled:opacity-60'
				)}
				placeholder={
					isImage
						? t('assistantNode.imagePlaceholder', 'Describe the image you want to create.')
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
