import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
	RotateCcw,
	RotateCw,
	Crop as CropIcon,
	RefreshCcw,
	Undo2,
	Check,
	X,
	Sparkles,
	ImageOff,
	ArrowUp,
	LoaderCircle,
	ImagePlus,
	ChevronDown,
	Scaling,
} from 'lucide-react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { Textarea } from '@/components/ui/Textarea';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from '@/components/ui/DropdownMenu';
import { MIN_CROP_SIZE } from '../../../editor/shared';
import { ToolbarButton } from '../../../editor/components/ToolbarButton';
import { ResizeControls } from '../../../editor/components/ResizeControls';
import { IMAGE_MODELS } from '../../../../../../shared/models';
import { getProvider } from '../../../../../../shared/providers';
import { useImageEditor } from './hooks/use-image-editor';

const TOOLTIP_DELAY_MS = 300;

export function ImageEditorView(): React.JSX.Element {
	const { t } = useTranslation();
	const {
		src,
		alt,
		state,
		canvas,
		refs,
		hasCropSelection,
		cropDimensionLabel,
		handleModeChange,
		handleCropChange,
		handleApplyCrop,
		handleResetCrop,
		handleSave,
		handleCancel,
		handleAISubmit,
		handleAIButtonClick,
		handlePromptKeyDown,
		handleEditorKeyDown,
		handleAIFileInputChange,
		handleAIDragOver,
		handleAIDragLeave,
		handleAIDrop,
		setAIPrompt,
		setSelectedModelId,
		removeAIFile,
		openFilePicker,
	} = useImageEditor();

	const { activeMode, isProcessingAI, aiPrompt, aiFiles, aiPreviewUrls, isDragOver, selectedModelId, crop } =
		state;
	const { canvasRef, state: canvasState, applyRotation, applyResize, undo, canUndo } = canvas;
	const currentWidth = canvasState.dimensions?.width ?? 0;
	const currentHeight = canvasState.dimensions?.height ?? 0;

	useEffect(() => {
		if (activeMode === 'ai') refs.aiTextareaRef.current?.focus();
		if (activeMode === 'resize') {
			const widthInput = refs.editorRef.current?.querySelector<HTMLInputElement>('#resize-width');
			widthInput?.focus();
		}
	}, [activeMode, refs.aiTextareaRef, refs.editorRef]);

	return (
		<div
			ref={refs.editorRef}
			className="overflow-hidden rounded-[1.55rem] border border-border bg-card/90"
			role="dialog"
			aria-modal="true"
			aria-label={t('imageNode.editorLabel', 'Image editor')}
			onKeyDown={handleEditorKeyDown}
		>
			<TooltipProvider delay={TOOLTIP_DELAY_MS}>
				<div className="border-b border-border">
					<div className="flex items-center gap-1 px-3 py-2.5">
						<div
							className="flex items-center gap-0.5"
							role="toolbar"
							aria-label={t('imageNode.editTools', 'Edit tools')}
						>
							<ToolbarButton
								icon={<CropIcon />}
								label={t('imageNode.crop')}
								onClick={() => handleModeChange('crop')}
								active={activeMode === 'crop'}
							/>
							<ToolbarButton
								icon={<RefreshCcw />}
								label={t('imageNode.rotate')}
								onClick={() => handleModeChange('rotate')}
								active={activeMode === 'rotate'}
							/>
							<ToolbarButton
								icon={<Scaling />}
								label={t('imageNode.resize')}
								onClick={() => handleModeChange('resize')}
								active={activeMode === 'resize'}
							/>
							<ToolbarButton
								icon={<Sparkles />}
								label="AI Transform"
								onClick={handleAIButtonClick}
								active={activeMode === 'ai'}
								disabled={!canvasState.isLoaded || isProcessingAI}
							/>
						</div>

						<div className="mx-1 h-4 w-px bg-border/60" aria-hidden="true" />

						<ToolbarButton icon={<Undo2 />} label="Undo" onClick={undo} disabled={!canUndo} />

						<div className="flex-1" />

						<div
							className="flex items-center gap-0.5"
							role="group"
							aria-label={t('imageNode.saveOrCancel', 'Save or cancel')}
						>
							<Button
								variant="ghost"
								size="icon-xs"
								aria-label={t('imageNode.cancel')}
								onClick={handleCancel}
								className="h-8 w-8 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive [&_svg]:h-4 [&_svg]:w-4"
							>
								<X />
							</Button>
							<Button
								variant="ghost"
								size="icon-xs"
								aria-label={t('imageNode.save')}
								onClick={handleSave}
								disabled={!canvasState.isLoaded}
								className="h-8 w-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary [&_svg]:h-4 [&_svg]:w-4"
							>
								<Check />
							</Button>
						</div>
					</div>

					{(activeMode === 'crop' || activeMode === 'rotate' || activeMode === 'resize') && (
						<div className="border-t border-border/60 bg-muted/30 px-2 py-1.5">
							{activeMode === 'crop' && (
								<div className="flex flex-wrap items-center gap-2">
									<Button
										size="sm"
										onClick={handleApplyCrop}
										disabled={!hasCropSelection}
										className="h-7 rounded-full px-2 text-xs"
									>
										{t('imageNode.applyCrop')}
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={handleResetCrop}
										disabled={!canvasState.cropRegion}
										className="h-7 rounded-full px-2 text-xs"
									>
										{t('imageNode.resetCrop')}
									</Button>
									<span
										className="ml-1 text-xs tabular-nums text-muted-foreground"
										aria-live="polite"
										aria-atomic="true"
									>
										{cropDimensionLabel}
									</span>
								</div>
							)}

							{activeMode === 'rotate' && (
								<div className="flex flex-wrap items-center gap-2">
									<ToolbarButton
										icon={<RotateCcw />}
										label={t('imageNode.rotateLeft')}
										onClick={() => applyRotation('left')}
										disabled={!canvasState.isLoaded}
									/>
									<ToolbarButton
										icon={<RotateCw />}
										label={t('imageNode.rotateRight')}
										onClick={() => applyRotation('right')}
										disabled={!canvasState.isLoaded}
									/>
									<span
										className="ml-1 text-xs tabular-nums text-muted-foreground"
										aria-live="polite"
										aria-atomic="true"
									>
										{canvasState.rotation}&deg;
									</span>
								</div>
							)}

							{activeMode === 'resize' && (
								<ResizeControls
									currentWidth={currentWidth}
									currentHeight={currentHeight}
									onApply={applyResize}
								/>
							)}
						</div>
					)}
				</div>
			</TooltipProvider>

			{activeMode === 'ai' && (
				<div
					className={cn('flex flex-col', isDragOver && 'ring-2 ring-inset ring-primary/40')}
					onDragOver={handleAIDragOver}
					onDragLeave={handleAIDragLeave}
					onDrop={handleAIDrop}
				>
					<input
						ref={refs.aiFileInputRef}
						type="file"
						accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif"
						className="hidden"
						onChange={handleAIFileInputChange}
						aria-hidden="true"
						tabIndex={-1}
						multiple
					/>
					<div className="border-b border-border/65 bg-muted/[0.28] px-3.5 pb-2 dark:border-white/10 dark:bg-white/[0.03]">
						<div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1">
							<div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[1.15rem] border border-border/75 bg-background/82 shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_6px_16px_hsl(var(--foreground)/0.05)] dark:border-white/12 dark:bg-white/[0.03] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_8px_18px_hsl(var(--background)/0.32)]">
								<img src={src} alt={alt ?? ''} className="h-full w-full object-contain" />
							</div>
							<Button
								variant="ghost"
								size="sm"
								className="h-16 shrink-0 rounded-[1.15rem] border border-dashed border-border/80 bg-background/76 px-3 text-xs font-medium text-muted-foreground shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_4px_10px_hsl(var(--foreground)/0.04)] hover:border-foreground/18 hover:bg-background hover:text-foreground dark:border-white/14 dark:bg-white/[0.03] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_6px_14px_hsl(var(--background)/0.26)] dark:hover:border-white/18 dark:hover:bg-white/[0.05]"
								disabled={isProcessingAI}
								onMouseDown={(e) => {
									e.preventDefault();
									openFilePicker();
								}}
							>
								<div className="flex flex-col items-center gap-1">
									<ImagePlus className="h-4 w-4" />
									<span>{t('imageNode.addImage', 'Add image')}</span>
								</div>
							</Button>
							{aiPreviewUrls.map((url, index) => (
								<div
									key={`${aiFiles[index]?.name ?? 'ref'}-${index}`}
									className="group/thumb relative h-16 w-16 shrink-0"
								>
									<div className="h-full w-full overflow-hidden rounded-[1.15rem] border border-border/75 bg-background/82 shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_6px_16px_hsl(var(--foreground)/0.05)] dark:border-white/12 dark:bg-white/[0.03] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_8px_18px_hsl(var(--background)/0.32)]">
										<img
											src={url}
											alt={aiFiles[index]?.name ?? ''}
											className="h-full w-full object-contain"
										/>
									</div>
									<Button
										variant="ghost"
										size="icon-xs"
										className="absolute -right-1.5 -top-1.5 z-10 h-5 w-5 rounded-full border border-border/70 bg-background text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover/thumb:opacity-100 hover:bg-background hover:text-foreground dark:border-white/12 dark:bg-background"
										onMouseDown={(e) => {
											e.preventDefault();
											removeAIFile(index);
										}}
										aria-label={t('imageNode.removeImage', 'Remove image')}
									>
										<X className="h-3 w-3" />
									</Button>
								</div>
							))}
						</div>
					</div>
					<Textarea
						ref={refs.aiTextareaRef}
						id="ai-prompt"
						value={aiPrompt}
						onChange={(e) => setAIPrompt(e.target.value)}
						onKeyDown={handlePromptKeyDown}
						placeholder={t(
							'imageNode.aiPromptPlaceholder',
							'Describe the image you want to create. You can also drop reference images here.'
						)}
						aria-label={t('imageNode.aiPromptLabel', 'AI transform prompt')}
						className={cn(
							'min-h-[92px] w-full resize-none border-none bg-transparent px-4 pt-4 pb-3 text-sm leading-6 text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
							'placeholder:text-foreground/42 dark:placeholder:text-muted-foreground/70',
							'disabled:cursor-not-allowed disabled:opacity-60'
						)}
						disabled={isProcessingAI}
						rows={1}
					/>
					<div className="flex items-center justify-between gap-3 border-t border-border/65 bg-[linear-gradient(180deg,hsl(var(--muted)/0.22)_0%,hsl(var(--background)/0.22)_100%)] px-3.5 py-2.5 dark:border-white/10 dark:bg-[linear-gradient(180deg,hsl(var(--muted)/0.12)_0%,hsl(var(--background)/0.16)_100%)]">
						<div className="flex min-w-0 items-center gap-2">
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<Button
											variant="ghost"
											size="sm"
											disabled={isProcessingAI}
											className="h-7 gap-1 rounded-full px-2 text-[11px] font-medium text-foreground/65 hover:text-foreground dark:text-muted-foreground/95 dark:hover:text-foreground"
										>
											<span className="truncate">
												{IMAGE_MODELS.find((m) => m.modelId === selectedModelId)?.name ??
													selectedModelId}
											</span>
											<ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
										</Button>
									}
								/>
								<DropdownMenuContent align="start" side="top" className="min-w-[180px]">
									{IMAGE_MODELS.map((model) => (
										<DropdownMenuItem
											key={model.modelId}
											onSelect={() => setSelectedModelId(model.modelId)}
											className={cn(
												selectedModelId === model.modelId && 'bg-accent text-accent-foreground'
											)}
										>
											<div className="flex flex-col gap-0.5">
												<span className="text-xs font-medium">{model.name}</span>
												<span className="text-[10px] text-muted-foreground">
													{getProvider(model.providerId)?.name ?? model.providerId}
												</span>
											</div>
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
							{isProcessingAI && (
								<span className="truncate text-[11px] font-medium text-foreground/65 dark:text-muted-foreground/95">
									{t('imageNode.aiProcessing', 'Processing...')}
								</span>
							)}
						</div>
						<Button
							variant="default"
							size="icon"
							className="h-7 w-7 shrink-0 rounded-full shadow-[0_6px_14px_hsl(var(--primary)/0.16)] dark:shadow-[0_8px_16px_hsl(var(--primary)/0.18)]"
							disabled={!aiPrompt.trim() || isProcessingAI}
							onMouseDown={(e) => {
								e.preventDefault();
								if (!isProcessingAI) handleAISubmit();
							}}
							aria-label={t('imageNode.aiApply', 'Apply AI transform')}
						>
							{isProcessingAI ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
						</Button>
					</div>
				</div>
			)}

			<div
				className={cn(
					'relative flex items-center justify-center p-3',
					activeMode === 'ai' && 'hidden'
				)}
			>
				{canvasState.hasError && (
					<div
						className={cn(
							'flex h-32 w-64 flex-col items-center justify-center gap-2',
							'rounded-md border border-dashed border-destructive/40 bg-destructive/5',
							'text-destructive/70'
						)}
						role="alert"
						aria-live="assertive"
					>
						<ImageOff className="h-6 w-6 opacity-50" aria-hidden="true" />
						<span className="text-xs">{alt ?? t('imageNode.notFound')}</span>
					</div>
				)}
				{!canvasState.hasError && (
					<div className="relative inline-block max-w-full">
						<ReactCrop
							crop={activeMode === 'crop' ? crop : undefined}
							onChange={handleCropChange}
							ruleOfThirds={activeMode === 'crop'}
							minWidth={MIN_CROP_SIZE}
							minHeight={MIN_CROP_SIZE}
							disabled={activeMode !== 'crop'}
							className="max-w-full"
						>
							<canvas
								ref={canvasRef}
								className="block max-w-full rounded"
								role="img"
								aria-label={alt ?? t('imageNode.canvasLabel', 'Image being edited')}
							/>
						</ReactCrop>
					</div>
				)}
			</div>
		</div>
	);
}
