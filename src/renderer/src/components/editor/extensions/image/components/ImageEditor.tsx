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
import { AppTextarea } from '@/components/app/AppTextarea';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';

function readFileAsDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (): void => resolve(reader.result as string);
		reader.onerror = (): void => reject(new Error(`FileReader failed for ${file.name}`));
		reader.readAsDataURL(file);
	});
}

export type EditMode = 'crop' | 'rotate' | 'ai';

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

	const hasContextControls = activeMode !== null;

	return (
		<div
			ref={editorRef}
			className="overflow-hidden rounded-lg border border-border bg-card/90"
			role="dialog"
			aria-modal="true"
			aria-label={t('imageNode.editorLabel', 'Image editor')}
			onKeyDown={handleEditorKeyDown}
		>
			<AppTooltipProvider delayDuration={300}>
				<div className="border-b border-border">
					{/* Primary toolbar row */}
					<div className="flex items-center gap-1 px-2 py-1.5">
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
								className="h-6 w-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive [&_svg]:h-3.5 [&_svg]:w-3.5"
							>
								<X />
							</AppButton>
							<AppButton
								variant="ghost"
								size="icon-xs"
								aria-label={t('imageNode.save')}
								onClick={handleSave}
								disabled={!state.isLoaded}
								className="h-6 w-6 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary [&_svg]:h-3.5 [&_svg]:w-3.5"
							>
								<Check />
							</AppButton>
						</div>
					</div>

					{/* Context controls row — only visible when a mode is active */}
					{hasContextControls && (
						<div className="border-t border-border/60 bg-muted/30 px-2 py-1.5">
							{activeMode === 'crop' && (
								<div className="flex flex-wrap items-center gap-2">
									<AppButton
										size="sm"
										onClick={handleApplyCrop}
										disabled={!hasCropSelection}
										className="h-7 px-2 text-xs"
									>
										{t('imageNode.applyCrop')}
									</AppButton>
									<AppButton
										variant="outline"
										size="sm"
										onClick={handleResetCrop}
										disabled={!state.cropRegion}
										className="h-7 px-2 text-xs"
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

							{activeMode === 'ai' && (
								<div className="flex flex-col">
									{/* Current image thumbnail */}
									<div className="border-b border-border/65 bg-muted/[0.28] px-3.5 pt-3 pb-2 dark:border-white/10 dark:bg-white/[0.03]">
										<div className="flex items-center gap-2 pb-1">
											<div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[1.15rem] border border-border/75 bg-background/82 shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_6px_16px_hsl(var(--foreground)/0.05)] dark:border-white/12 dark:bg-white/[0.03] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_8px_18px_hsl(var(--background)/0.32)]">
												<img src={src} alt={alt ?? ''} className="h-full w-full object-cover" />
											</div>
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
									{/* Footer with status + submit */}
									<div className="flex items-center justify-between gap-3 border-t border-border/65 bg-[linear-gradient(180deg,hsl(var(--muted)/0.22)_0%,hsl(var(--background)/0.22)_100%)] px-3.5 py-2.5 dark:border-white/10 dark:bg-[linear-gradient(180deg,hsl(var(--muted)/0.12)_0%,hsl(var(--background)/0.16)_100%)]">
										<div className="flex min-w-0 items-center gap-2">
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
						</div>
					)}
				</div>
			</AppTooltipProvider>

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
