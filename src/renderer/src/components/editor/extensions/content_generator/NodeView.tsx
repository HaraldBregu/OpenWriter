import React from 'react';
import { useTranslation } from 'react-i18next';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { Provider } from './Provider';
import { useContentGenerator } from './hooks/use-content-generator';
import { Attachment } from './components';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuCheckboxItem,
} from '@/components/ui/DropdownMenu';
import { ImageIcon, PenLine, ChevronDown, LoaderCircle, ArrowUp } from 'lucide-react';
import { getProvider } from 'src/shared';
import { IMAGE_MODELS, TEXT_MODELS } from '../../../../../../shared/models';
import { Button } from '@/components/ui/Button';

function ContentGeneratorInner(): React.JSX.Element {
	const { t } = useTranslation();
	const {
		state,
		loading,
		enable,
		agentId,
		isImage,
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

	const modelOptions = isImage ? IMAGE_MODELS : TEXT_MODELS;
	const selectedModel = isImage ? state.selectedImageModel : state.selectedTextModel;
	const handleModelChange = isImage ? handleImageModelChange : handleTextModelChange;

	const currentAgentLabel = isImage
		? t('assistantAgent.image', 'Image')
		: t('assistantAgent.text', 'Text');

	return (
		<Card
			onDragOver={isImage ? handleDragOver : undefined}
			onDragLeave={isImage ? handleDragLeave : undefined}
			onDrop={isImage ? handleDrop : undefined}
		>
			<CardContent>
				{isImage && (
					<Attachment
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
						'p-0 rounded-none w-full resize-none border-none bg-transparent dark:bg-transparent focus:bg-transparent text-[15px] leading-7 text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
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
			</CardContent>
			<CardFooter className="bg-transparent border-none">
				<div className="flex items-center gap-3">
					<DropdownMenu modal={false}>
						<DropdownMenuTrigger
							disabled={loading}
							render={
								<Button
									variant="outline"
									size="icon"
									title={currentAgentLabel}
									aria-label={t('assistantNode.switchAgent', 'Switch agent')}
									onMouseDown={(e) => {
										e.preventDefault();
										e.stopPropagation();
									}}
								>
									{agentId === 'image' && <ImageIcon />}
									{agentId === 'writer' && <PenLine />}
								</Button>
							}
						/>
						<DropdownMenuContent align="start" side="top" sideOffset={8} className="w-30">
							<DropdownMenuCheckboxItem
								checked={!isImage}
								onCheckedChange={() => handleAgentChange('text')}
							>
								<PenLine />
								{t('assistantAgent.text', 'Text')}
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem
								checked={isImage}
								onCheckedChange={() => handleAgentChange('image')}
							>
								<ImageIcon />
								{t('assistantAgent.image', 'Image')}
							</DropdownMenuCheckboxItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<DropdownMenu modal={false}>
						<DropdownMenuTrigger
							render={
								<Button
									variant="outline"
									size="md"
									disabled={loading}
									onMouseDown={(e) => {
										e.preventDefault();
										e.stopPropagation();
									}}
								>
									<span className="truncate text-xs font-medium text-foreground">
										{selectedModel.name}
									</span>
									<ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/80" />
								</Button>
							}
						/>
						<DropdownMenuContent align="start" side="top" sideOffset={8} className="w-50 max-h-100">
							{modelOptions.map((model) => (
								<DropdownMenuCheckboxItem
									key={model.modelId}
									checked={selectedModel.modelId === model.modelId}
									onCheckedChange={() => handleModelChange(model)}
								>
									<div className="flex min-w-0 flex-col gap-0.5">
										<span className="truncate text-sm font-medium">{model.name}</span>
										<span className="text-xs text-muted-foreground">
											{getProvider(model.providerId)?.name ?? model.providerId}
										</span>
									</div>
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				<Button
					variant="prompt-submit"
					size="icon"
					className="ml-auto shrink-0"
					disabled={isSubmitDisabled}
					onMouseDown={(e) => e.preventDefault()}
					onClick={() => {
						if (!loading) submitRef.current?.();
					}}
					aria-label={t('agenticPanel.send', 'Send message')}
				>
					{loading ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
				</Button>
			</CardFooter>
		</Card>
	);
}

export function ContentGeneratorNodeView(props: NodeViewProps): React.JSX.Element {
	return (
		<NodeViewWrapper contentEditable={false}>
			<Provider nodeViewProps={props}>
				<ContentGeneratorInner />
			</Provider>
		</NodeViewWrapper>
	);
}
