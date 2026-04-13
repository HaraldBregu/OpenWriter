import React from 'react';
import { useTranslation } from 'react-i18next';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { ContentGeneratorProvider } from './Provider';
import { useContentGenerator } from './hooks/use-content-generator';
import { ImageAttachmentBar, PromptFooter, PromptHeader } from './components';

function ContentGeneratorInner(): React.JSX.Element {
	const { t } = useTranslation();
	const {
		state,
		loading,
		enable,
		agentId,
		isImage,
		activeModel,
		isSubmitDisabled,
		textareaRef,
		fileInputRef,
		submitRef,
		handlePromptChange,
		handleAgentChange,
		handleImageModelChange,
		handleTextModelChange,
		removeFile,
		handleFileInputChange,
		handleOpenFilePicker,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		resizeTextarea,
	} = useContentGenerator();

	const inputLabel = isImage
		? t('assistantNode.imageTitle', 'Generate image')
		: t('assistantNode.writerTitle', 'Generate text');

	return (
		<Card
			onDragOver={isImage ? handleDragOver : undefined}
			onDragLeave={isImage ? handleDragLeave : undefined}
			onDrop={isImage ? handleDrop : undefined}
		>
			<PromptHeader agentId={agentId} modelName={activeModel.name} />
			{isImage && (
				<ImageAttachmentBar
					files={state.files}
					previewUrls={state.previewUrls}
					isDragOver={state.isDragOver}
					disabled={!enable || loading}
					fileInputRef={fileInputRef}
					onOpenFilePicker={handleOpenFilePicker}
					onRemoveFile={removeFile}
					onFileInputChange={handleFileInputChange}
				/>
			)}
			<Textarea
				ref={textareaRef}
				value={state.prompt}
				onChange={(e) => {
					handlePromptChange(e.target.value);
					resizeTextarea();
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
				selectedImageModel={state.selectedImageModel}
				selectedTextModel={state.selectedTextModel}
				loading={loading}
				isSubmitDisabled={isSubmitDisabled}
				submitRef={submitRef}
				onAgentChange={handleAgentChange}
				onImageModelChange={handleImageModelChange}
				onTextModelChange={handleTextModelChange}
			/>
		</Card>
	);
}

export function ContentGeneratorNodeView(props: NodeViewProps): React.JSX.Element {
	return (
		<NodeViewWrapper contentEditable={false}>
			<ContentGeneratorProvider nodeViewProps={props}>
				<ContentGeneratorInner />
			</ContentGeneratorProvider>
		</NodeViewWrapper>
	);
}
