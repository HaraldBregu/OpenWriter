import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import type { PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { cn } from '@/lib/utils';
import { AppButton } from '@/components/app/AppButton';
import { AppTooltipProvider } from '@/components/app/AppTooltip';
import { MIN_CROP_SIZE } from '../shared';
import { useImageCanvas } from '../shared/use-image-canvas';
import { ToolbarButton } from './ToolbarButton';
import { ResizeControls } from './ResizeControls';
import { AppTextarea } from '@/components/app/AppTextarea';
import {
	AppDropdownMenu,
	AppDropdownMenuTrigger,
	AppDropdownMenuContent,
	AppDropdownMenuItem,
} from '@/components/app/AppDropdownMenu';
import { IMAGE_MODELS } from '../../../../../../../shared/models';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';

function readFileAsDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (): void => resolve(reader.result as string);
		reader.onerror = (): void => reject(new Error(`FileReader failed for ${file.name}`));
		reader.readAsDataURL(file);
	});
}

export type EditMode = 'crop' | 'rotate' | 'resize' | 'ai';

export interface ImageEditorProps {
	src: string;
	alt: string | null;
	initialMode?: EditMode;
	onSave: (dataUri: string) => void;
	onCancel: () => void;
}

export function ImageEditor({
	src,
	alt,
	initialMode,
	onSave,
	onCancel,
}: ImageEditorProps): React.JSX.Element {
	const { t } = useTranslation();
	const [activeMode, setActiveMode] = useState<EditMode | null>(initialMode ?? null);
	const [isProcessingAI, setIsProcessingAI] = useState(false);
	const [aiPrompt, setAIPrompt] = useState('');
	const [aiFiles, setAIFiles] = useState<File[]>([]);
	const [aiPreviewUrls, setAIPreviewUrls] = useState<string[]>([]);
	const [isDragOver, setIsDragOver] = useState(false);
	const [selectedModelId, setSelectedModelId] = useState(IMAGE_MODELS[0]?.modelId ?? '');
	const editorRef = useRef<HTMLDivElement>(null);
	const aiTextareaRef = useRef<HTMLTextAreaElement>(null);
	const aiFileInputRef = useRef<HTMLInputElement>(null);
	const {
		canvasRef,
		state,
		applyRotation,
		applyCrop,
		resetCrop,
		setCropRegion,
		applyResize,
		applyAI,
		undo,
		canUndo,
		exportDataUri,
	} = useImageCanvas(src);

	const [crop, setCrop] = useState<PixelCrop>();

	const handleCropChange = useCallback(
		(pixelCrop: PixelCrop): void => {
			setCrop(pixelCrop);
			const canvas = canvasRef.current;
			if (!canvas || canvas.clientWidth === 0 || canvas.clientHeight === 0) return;
			const scaleX = canvas.width / canvas.clientWidth;
			const scaleY = canvas.height / canvas.clientHeight;
			setCropRegion({
				x: Math.round(pixelCrop.x * scaleX),
				y: Math.round(pixelCrop.y * scaleY),
				width: Math.round(pixelCrop.width * scaleX),
				height: Math.round(pixelCrop.height * scaleY),
			});
		},
		[canvasRef, setCropRegion]
	);

	const addAIFile = useCallback((newFile: File) => {
		setAIFiles((prev) => [...prev, newFile]);
		readFileAsDataUri(newFile)
			.then((result) => {
				setAIPreviewUrls((prev) => [...prev, result]);
			})
			.catch(() => {});
	}, []);

	const removeAIFile = useCallback((index: number) => {
		setAIFiles((prev) => prev.filter((_, i) => i !== index));
		setAIPreviewUrls((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const handleAIFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const selected = e.target.files;
			if (!selected) return;
			for (const file of Array.from(selected)) {
				if (file.type.startsWith('image/')) {
					addAIFile(file);
				}
			}
			e.target.value = '';
		},
		[addAIFile]
	);

	const handleAIDragOver = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
		e.preventDefault();
		setIsDragOver(true);
	}, []);

	const handleAIDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
		e.preventDefault();
		setIsDragOver(false);
	}, []);

	const handleAIDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>): void => {
			e.preventDefault();
			setIsDragOver(false);
			for (const file of Array.from(e.dataTransfer.files)) {
				if (file.type.startsWith('image/')) {
					addAIFile(file);
				}
			}
		},
		[addAIFile]
	);

	const handleApplyCrop = useCallback((): void => {
		applyCrop();
		setCrop(undefined);
	}, [applyCrop]);

	const handleResetCrop = useCallback((): void => {
		resetCrop();
		setCrop(undefined);
	}, [resetCrop]);

	const handleSave = useCallback((): void => {
		const dataUri = exportDataUri();
		if (dataUri) {
			onSave(dataUri);
		}
	}, [exportDataUri, onSave]);

	const handleModeChange = useCallback(
		(mode: EditMode): void => {
			setActiveMode((prevMode) => {
				const nextMode = prevMode === mode ? null : mode;
				if (prevMode === 'crop' && nextMode !== 'crop') {
					resetCrop();
					setCrop(undefined);
				}
				return nextMode;
			});
		},
		[resetCrop]
	);

	useEffect(() => {
		if (activeMode === 'ai') {
			aiTextareaRef.current?.focus();
		}
		if (activeMode === 'resize') {
			const widthInput = editorRef.current?.querySelector<HTMLInputElement>('#resize-width');
			widthInput?.focus();
		}
	}, [activeMode]);

	const handleAISubmit = useCallback((): void => {
		if (!aiPrompt.trim()) return;
		setIsProcessingAI(true);
		// Simulate processing delay for better UX
		setTimeout(() => {
			applyAI(aiPrompt.trim());
			setAIPrompt('');
			setActiveMode(null);
			setIsProcessingAI(false);
		}, 300);
	}, [aiPrompt, applyAI]);

	const handleAIButtonClick = useCallback((): void => {
		if (isProcessingAI) return;
		handleModeChange('ai');
	}, [isProcessingAI, handleModeChange]);

	const handleCancelAI = useCallback((): void => {
		if (isProcessingAI) return;
		setAIPrompt('');
		setAIFiles([]);
		setAIPreviewUrls([]);
		setActiveMode(null);
	}, [isProcessingAI]);

	const handlePromptKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
			if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
				handleAISubmit();
			}
			if (e.key === 'Escape') {
				handleCancelAI();
			}
		},
		[handleAISubmit, handleCancelAI]
	);

	const handleEditorKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>): void => {
			if (e.key === 'Escape') {
				onCancel();
			}
		},
		[onCancel]
	);

	const currentWidth = state.dimensions?.width ?? 0;
	const currentHeight = state.dimensions?.height ?? 0;
	const cropWidth = state.cropRegion?.width ?? 0;
	const cropHeight = state.cropRegion?.height ?? 0;
	const hasCropSelection =
		state.cropRegion !== null && cropWidth >= MIN_CROP_SIZE && cropHeight >= MIN_CROP_SIZE;

	const cropDimensionLabel = hasCropSelection
		? `${Math.round(cropWidth)} x ${Math.round(cropHeight)} px`
		: `${currentWidth} x ${currentHeight} px`;

	return (
		<div
			ref={editorRef}
			className="overflow-hidden rounded-[1.55rem] border border-border bg-card/90"
			role="dialog"
			aria-modal="true"
			aria-label={t('imageNode.editorLabel', 'Image editor')}
			onKeyDown={handleEditorKeyDown}
		>
			<AppTooltipProvider delay={300}>
				<div className="border-b border-border">
					{/* Primary toolbar row */}
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
								disabled={!state.isLoaded || isProcessingAI}
							/>
						</div>

						<div className="mx-1 h-4 w-px bg-border/60" aria-hidden="true" />

						<ToolbarButton icon={<Undo2 />} label="Undo" onClick={undo} disabled={!canUndo} />

						<div className="flex-1" />

						{/* Save / Cancel — visually distinct */}
						<div
							className="flex items-center gap-0.5"
							role="group"
							aria-label={t('imageNode.saveOrCancel', 'Save or cancel')}
						>
							<AppButton
								variant="ghost"
								size="icon-xs"
								aria-label={t('imageNode.cancel')}
								onClick={onCancel}
								className="h-8 w-8 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive [&_svg]:h-4 [&_svg]:w-4"
							>
								<X />
							</AppButton>
							<AppButton
								variant="ghost"
								size="icon-xs"
								aria-label={t('imageNode.save')}
								onClick={handleSave}
								disabled={!state.isLoaded}
								className="h-8 w-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary [&_svg]:h-4 [&_svg]:w-4"
							>
								<Check />
							</AppButton>
						</div>
					</div>

					{/* Context controls row — crop / rotate / resize */}
					{(activeMode === 'crop' || activeMode === 'rotate' || activeMode === 'resize') && (
						<div className="border-t border-border/60 bg-muted/30 px-2 py-1.5">
							{activeMode === 'crop' && (
								<div className="flex flex-wrap items-center gap-2">
									<AppButton
										size="sm"
										onClick={handleApplyCrop}
										disabled={!hasCropSelection}
										className="h-7 rounded-full px-2 text-xs"
									>
										{t('imageNode.applyCrop')}
									</AppButton>
									<AppButton
										variant="outline"
										size="sm"
										onClick={handleResetCrop}
										disabled={!state.cropRegion}
										className="h-7 rounded-full px-2 text-xs"
									>
										{t('imageNode.resetCrop')}
									</AppButton>
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
										disabled={!state.isLoaded}
									/>
									<ToolbarButton
										icon={<RotateCw />}
										label={t('imageNode.rotateRight')}
										onClick={() => applyRotation('right')}
										disabled={!state.isLoaded}
									/>
									<span
										className="ml-1 text-xs tabular-nums text-muted-foreground"
										aria-live="polite"
										aria-atomic="true"
									>
										{state.rotation}&deg;
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
			</AppTooltipProvider>

			{/* AI transform panel — full-width, matches AssistantContent painter style */}
			{activeMode === 'ai' && (
				<div
					className={cn('flex flex-col', isDragOver && 'ring-2 ring-inset ring-primary/40')}
					onDragOver={handleAIDragOver}
					onDragLeave={handleAIDragLeave}
					onDrop={handleAIDrop}
				>
					{/* Hidden file input */}
					<input
						ref={aiFileInputRef}
						type="file"
						accept={ACCEPTED_IMAGE_TYPES}
						className="hidden"
						onChange={handleAIFileInputChange}
						aria-hidden="true"
						tabIndex={-1}
						multiple
					/>
					{/* Image strip */}
					<div className="border-b border-border/65 bg-muted/[0.28] px-3.5 pb-2 dark:border-white/10 dark:bg-white/[0.03]">
						<div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1">
							{/* Current image thumbnail */}
							<div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[1.15rem] border border-border/75 bg-background/82 shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_6px_16px_hsl(var(--foreground)/0.05)] dark:border-white/12 dark:bg-white/[0.03] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_8px_18px_hsl(var(--background)/0.32)]">
								<img src={src} alt={alt ?? ''} className="h-full w-full object-contain" />
							</div>
							{/* Add image button */}
							<AppButton
								variant="ghost"
								size="sm"
								className="h-16 shrink-0 rounded-[1.15rem] border border-dashed border-border/80 bg-background/76 px-3 text-xs font-medium text-muted-foreground shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_4px_10px_hsl(var(--foreground)/0.04)] hover:border-foreground/18 hover:bg-background hover:text-foreground dark:border-white/14 dark:bg-white/[0.03] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_6px_14px_hsl(var(--background)/0.26)] dark:hover:border-white/18 dark:hover:bg-white/[0.05]"
								disabled={isProcessingAI}
								onMouseDown={(e) => {
									e.preventDefault();
									aiFileInputRef.current?.click();
								}}
							>
								<div className="flex flex-col items-center gap-1">
									<ImagePlus className="h-4 w-4" />
									<span>{t('imageNode.addImage', 'Add image')}</span>
								</div>
							</AppButton>
							{/* Uploaded reference thumbnails */}
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
									<AppButton
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
									</AppButton>
								</div>
							))}
						</div>
					</div>
					{/* Prompt textarea */}
					<AppTextarea
						ref={aiTextareaRef}
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
					{/* Footer */}
					<div className="flex items-center justify-between gap-3 border-t border-border/65 bg-[linear-gradient(180deg,hsl(var(--muted)/0.22)_0%,hsl(var(--background)/0.22)_100%)] px-3.5 py-2.5 dark:border-white/10 dark:bg-[linear-gradient(180deg,hsl(var(--muted)/0.12)_0%,hsl(var(--background)/0.16)_100%)]">
						<div className="flex min-w-0 items-center gap-2">
							<AppDropdownMenu>
								<AppDropdownMenuTrigger asChild>
									<AppButton
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
									</AppButton>
								</AppDropdownMenuTrigger>
								<AppDropdownMenuContent align="start" side="top" className="min-w-[180px]">
									{IMAGE_MODELS.map((model) => (
										<AppDropdownMenuItem
											key={model.modelId}
											onSelect={() => setSelectedModelId(model.modelId)}
											className={cn(
												selectedModelId === model.modelId && 'bg-accent text-accent-foreground'
											)}
										>
											<div className="flex flex-col gap-0.5">
												<span className="text-xs font-medium">{model.name}</span>
												<span className="text-[10px] text-muted-foreground">{model.provider}</span>
											</div>
										</AppDropdownMenuItem>
									))}
								</AppDropdownMenuContent>
							</AppDropdownMenu>
							{isProcessingAI && (
								<span className="truncate text-[11px] font-medium text-foreground/65 dark:text-muted-foreground/95">
									{t('imageNode.aiProcessing', 'Processing...')}
								</span>
							)}
						</div>
						<AppButton
							variant="prompt-submit"
							size="prompt-submit-md"
							className="h-7 w-7 shrink-0 rounded-full shadow-[0_6px_14px_hsl(var(--primary)/0.16)] dark:shadow-[0_8px_16px_hsl(var(--primary)/0.18)]"
							disabled={!aiPrompt.trim() || isProcessingAI}
							onMouseDown={(e) => {
								e.preventDefault();
								if (!isProcessingAI) handleAISubmit();
							}}
							aria-label={t('imageNode.aiApply', 'Apply AI transform')}
						>
							{isProcessingAI ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
						</AppButton>
					</div>
				</div>
			)}

			{/* Canvas area — hidden during AI transform (thumbnail shown in AI panel) */}
			<div
				className={cn(
					'relative flex items-center justify-center p-3',
					activeMode === 'ai' && 'hidden'
				)}
			>
				{state.hasError && (
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
				{!state.hasError && (
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
