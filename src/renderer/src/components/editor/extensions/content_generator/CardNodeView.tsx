import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import {
	FileUpload,
	FileUploadTrigger,
	FileUploadList,
	FileUploadItem,
	FileUploadItemPreview,
	FileUploadItemDelete,
} from '@/components/ui/FileUpload';
import { useContentGenerator } from './hooks/use-content-generator';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuCheckboxItem,
} from '@/components/ui/DropdownMenu';
import { ImageIcon, ImagePlus, PenLine, ChevronDown, LoaderCircle, ArrowUp, X } from 'lucide-react';
import { getProvider } from 'src/shared';
import { IMAGE_MODELS, TEXT_MODELS } from '../../../../../../shared/models';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';

export function CardNodeView(): React.JSX.Element {
	const { t } = useTranslation();
	const {
		state,
		loading,
		enable,
		agentId,
		isImage,
		isSubmitDisabled,
		textareaRef,
		submitRef,
		handlePromptChange,
		handleAgentChange,
		handleImageModelChange,
		handleTextModelChange,
		handleFilesChange,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		resizeTextarea,
	} = useContentGenerator();

	const inputLabel = isImage
		? t('assistantNode.imageTitle', 'Generate image')
		: t('assistantNode.textTitle', 'Generate text');

	const modelOptions = isImage ? IMAGE_MODELS : TEXT_MODELS;
	const selectedModel = isImage ? state.selectedImageModel : state.selectedTextModel;
	const handleModelChange = isImage ? handleImageModelChange : handleTextModelChange;

	const currentAgentLabel = isImage
		? t('assistantAgent.image', 'Image')
		: t('assistantAgent.text', 'Text');

	const isDisabled = !enable || loading;

	const card = (
		<Card
			onDragOver={isImage ? handleDragOver : undefined}
			onDragLeave={isImage ? handleDragLeave : undefined}
			onDrop={isImage ? handleDrop : undefined}
		>
			{isImage && (
				<CardHeader className="space-y-0 p-0 px-3.5">
					<div className="flex items-center gap-2">
						<FileUploadTrigger
							render={
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="h-7 w-7 rounded-full border border-border/80 bg-background/75 text-foreground/80 shadow-none hover:border-foreground/15 hover:bg-accent/70 dark:border-border/90 dark:bg-background/50 dark:text-foreground/90 dark:hover:bg-accent/80"
									title={t('assistantNode.addImage', 'Add image')}
									aria-label={t('assistantNode.addImage', 'Add image')}
								/>
							}
						>
							<ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
						</FileUploadTrigger>
					</div>

					<FileUploadList
						orientation="horizontal"
						className="flex-row items-center gap-2 overflow-x-auto border-0 p-0 pb-1 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
					>
						{state.files.map((file) => (
							<FileUploadItem
								key={`${file.name}-${file.lastModified}-${file.size}`}
								value={file}
								className="group/thumb relative shrink-0 gap-0 rounded-none border-0 p-0"
							>
								<FileUploadItemPreview className="h-14 w-14 rounded-xl border border-border/70 bg-muted/30 dark:border-white/12 dark:bg-white/[0.04]" />
								<FileUploadItemDelete
									render={
										<button
											type="button"
											className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/thumb:opacity-100 group-focus-within/thumb:opacity-100 dark:border-white/12 dark:bg-background"
											onMouseDown={(e) => e.preventDefault()}
											aria-label={t('assistantNode.removeImage', 'Remove image')}
										/>
									}
								>
									<X className="h-2.5 w-2.5" aria-hidden="true" />
								</FileUploadItemDelete>
							</FileUploadItem>
						))}
						<FileUploadTrigger
							render={
								<button
									type="button"
									className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-border/80 bg-background/60 text-muted-foreground transition-colors hover:border-foreground/18 hover:bg-background hover:text-foreground dark:border-white/14 dark:bg-white/[0.03] dark:hover:border-white/18 dark:hover:bg-white/[0.05]"
									onMouseDown={(e) => e.preventDefault()}
									aria-label={t('assistantNode.addImage', 'Add image')}
								/>
							}
						>
							<ImagePlus className="h-4 w-4" aria-hidden="true" />
						</FileUploadTrigger>
					</FileUploadList>
				</CardHeader>
			)}
			<CardContent>
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
									{agentId === 'text' && <PenLine />}
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
					variant="default"
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

	if (isImage) {
		return (
			<FileUpload
				accept={ACCEPTED_IMAGE_TYPES}
				multiple
				disabled={isDisabled}
				value={state.files}
				onValueChange={handleFilesChange}
			>
				{card}
			</FileUpload>
		);
	}

	return card;
}
