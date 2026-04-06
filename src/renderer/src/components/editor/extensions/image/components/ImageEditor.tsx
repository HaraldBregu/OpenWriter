import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	RotateCcw,
	RotateCw,
	Crop,
	Maximize2,
	RefreshCcw,
	Undo2,
	Check,
	X,
	Sparkles,
	WandSparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppButton } from '@/components/app/AppButton';
import { AppTooltipProvider } from '@/components/app/AppTooltip';
import { MIN_CROP_SIZE } from '../shared';
import { useImageCanvas, IMAGE_EFFECT_OPTIONS } from '../shared/use-image-canvas';
import { ToolbarButton } from './ToolbarButton';
import { CropOverlay } from './CropOverlay';
import { ResizeControls } from './ResizeControls';
import { AppTextarea } from '@/components/app/AppTextarea';

export interface ImageEditorProps {
	src: string;
	alt: string | null;
	onSave: (dataUri: string) => void;
	onCancel: () => void;
}

type EditMode = 'crop' | 'resize' | 'rotate' | 'effects' | 'ai';

export function ImageEditor({ src, alt, onSave, onCancel }: ImageEditorProps): React.JSX.Element {
	const { t } = useTranslation();
	const [activeMode, setActiveMode] = useState<EditMode | null>(null);
	const [isProcessingAI, setIsProcessingAI] = useState(false);
	const [aiPrompt, setAIPrompt] = useState('');

	const {
		canvasRef,
		state,
		applyRotation,
		applyCrop,
		resetCrop,
		setCropRegion,
		applyResize,
		applyAI,
		applyEffect,
		undo,
		canUndo,
		exportDataUri,
	} = useImageCanvas(src);

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
				}
				return nextMode;
			});
		},
		[resetCrop]
	);

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
		},
		[handleAISubmit]
	);

	const currentWidth = state.dimensions?.width ?? 0;
	const currentHeight = state.dimensions?.height ?? 0;
	const hasCropSelection =
		state.cropRegion !== null &&
		state.cropRegion.width >= MIN_CROP_SIZE &&
		state.cropRegion.height >= MIN_CROP_SIZE;

	return (
		<div className="overflow-hidden rounded-lg border border-border bg-card/90">
			{/* Top toolbar: mode buttons + undo + save/cancel */}
			<AppTooltipProvider delayDuration={300}>
				<div className="border-b border-border">
					<div className="flex items-center gap-1 px-2 py-1.5">
						{/* Mode buttons */}
						<ToolbarButton
							icon={<Crop />}
							label={t('imageNode.crop')}
							onClick={() => handleModeChange('crop')}
							active={activeMode === 'crop'}
						/>
						<ToolbarButton
							icon={<Maximize2 />}
							label={t('imageNode.resize')}
							onClick={() => handleModeChange('resize')}
							active={activeMode === 'resize'}
						/>
						<ToolbarButton
							icon={<RefreshCcw />}
							label={t('imageNode.rotate')}
							onClick={() => handleModeChange('rotate')}
							active={activeMode === 'rotate'}
						/>

						<ToolbarButton
							icon={<WandSparkles />}
							label={t('imageNode.effects')}
							onClick={() => handleModeChange('effects')}
							active={activeMode === 'effects'}
							disabled={!state.isLoaded}
						/>

						<ToolbarButton
							icon={<Sparkles />}
							label="AI Transform"
							onClick={handleAIButtonClick}
							active={activeMode === 'ai'}
							disabled={!state.isLoaded || isProcessingAI}
						/>

						{/* Undo */}
						<ToolbarButton icon={<Undo2 />} label="Undo" onClick={undo} disabled={!canUndo} />

						{/* Spacer */}
						<div className="flex-1" />

						{/* Save / Cancel */}
						<AppButton
							variant="ghost"
							size="icon-xs"
							aria-label={t('imageNode.cancel')}
							onClick={onCancel}
							className="h-6 w-6 text-muted-foreground hover:text-destructive [&_svg]:h-3.5 [&_svg]:w-3.5"
						>
							<X />
						</AppButton>
						<AppButton
							variant="ghost"
							size="icon-xs"
							aria-label={t('imageNode.save')}
							onClick={handleSave}
							disabled={!state.isLoaded}
							className="h-6 w-6 text-muted-foreground hover:text-success [&_svg]:h-3.5 [&_svg]:w-3.5"
						>
							<Check />
						</AppButton>
					</div>

					<div className="flex flex-wrap items-center gap-2 border-t border-border px-2 py-1.5">
						{activeMode === 'crop' && (
							<>
								<AppButton
									size="sm"
									onClick={applyCrop}
									disabled={!hasCropSelection}
									className="h-7 px-2 text-xs"
								>
									{t('imageNode.applyCrop')}
								</AppButton>
								<AppButton
									variant="outline"
									size="sm"
									onClick={resetCrop}
									disabled={!state.cropRegion}
									className="h-7 px-2 text-xs"
								>
									{t('imageNode.resetCrop')}
								</AppButton>
								<span className="ml-1 text-xs text-muted-foreground">
									{hasCropSelection
										? `${Math.round(state.cropRegion!.width)} x ${Math.round(state.cropRegion!.height)} px`
										: `${currentWidth} x ${currentHeight} px`}
								</span>
							</>
						)}

						{activeMode === 'resize' && state.isLoaded && (
							<ResizeControls
								currentWidth={currentWidth}
								currentHeight={currentHeight}
								onApply={applyResize}
							/>
						)}

						{activeMode === 'rotate' && (
							<>
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
								<span className="ml-1 text-xs text-muted-foreground">{state.rotation}</span>
							</>
						)}

						{activeMode === 'effects' && (
						<div className="flex w-full flex-col gap-2">
							<div className="flex flex-wrap gap-2">
									{IMAGE_EFFECT_OPTIONS.map((effect) => (
										<AppButton
											key={effect.type}
											size="sm"
											onClick={() => applyEffect(effect.type)}
											className="h-7 px-2 text-xs"
											disabled={!state.isLoaded}
										>
											{t(effect.labelKey)}
										</AppButton>
									))}
								</div>
							</div>
						)}
					</div>
					{activeMode === 'ai' && (
						<div className="border-t border-border px-2 py-3">
							<div className="border border-border/65 bg-muted/[0.28] px-3.5 pt-3 pb-2 dark:border-white/10 dark:bg-white/[0.03]">
								<AppTextarea
									id="ai-prompt"
									value={aiPrompt}
									onChange={(e) => setAIPrompt(e.target.value)}
									onKeyDown={handlePromptKeyDown}
									placeholder={t(
										'imageNode.aiPromptPlaceholder',
										'Describe the image you want to create. You can also drop reference images here.'
									)}
									className={cn(
										'min-h-[92px] w-full resize-none border-none bg-transparent px-4 pt-4 pb-3 text-sm leading-6 text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
										'placeholder:text-foreground/42 dark:placeholder:text-muted-foreground/70',
										'disabled:cursor-not-allowed disabled:opacity-60'
									)}
									disabled={isProcessingAI}
								/>
							</div>
							<div className="flex gap-2 pt-2">
								<AppButton
									variant="outline"
									size="sm"
									onClick={handleCancelAI}
									disabled={isProcessingAI}
									className="flex-1 text-xs"
								>
									{t('imageNode.cancel')}
								</AppButton>
								<AppButton
									size="sm"
									onClick={handleAISubmit}
									disabled={!aiPrompt.trim() || isProcessingAI}
									className="flex-1 text-xs"
								>
									{isProcessingAI ? t('imageNode.aiProcessing') : t('imageNode.aiApply')}
								</AppButton>
							</div>
						</div>
					)}
				</div>
			</AppTooltipProvider>

			{/* Canvas area */}
			<div className="relative flex items-center justify-center p-3">
				{state.hasError && (
					<div className="flex h-32 items-center justify-center text-sm text-destructive">
						{alt ?? t('imageNode.notFound')}
					</div>
				)}
				{!state.hasError && (
					<div className="relative inline-block max-w-full">
						<canvas
							ref={canvasRef}
							className="block max-w-full rounded"
							aria-label={alt ?? 'Image being edited'}
						/>
						{activeMode === 'crop' && state.isLoaded && currentWidth > 0 && (
							<CropOverlay
								canvasWidth={currentWidth}
								canvasHeight={currentHeight}
								cropRegion={state.cropRegion}
								onCropChange={setCropRegion}
							/>
						)}
					</div>
				)}
			</div>

		</div>
	);
}
