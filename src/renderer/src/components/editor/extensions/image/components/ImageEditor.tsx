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
} from 'lucide-react';
import { AppButton } from '@/components/app/AppButton';
import { AppTooltipProvider } from '@/components/app/AppTooltip';
import { MIN_CROP_SIZE } from '../shared';
import { useImageCanvas } from '../use-image-canvas';
import { ToolbarButton } from './ToolbarButton';
import { CropOverlay } from './CropOverlay';
import { ResizeControls } from './ResizeControls';
import { AIPromptDialog } from './AIPromptDialog';

export interface ImageEditorProps {
	src: string;
	alt: string | null;
	onSave: (dataUri: string) => void;
	onCancel: () => void;
}

type EditMode = 'crop' | 'resize' | 'rotate';

export function ImageEditor({ src, alt, onSave, onCancel }: ImageEditorProps): React.JSX.Element {
	const { t } = useTranslation();
	const [activeMode, setActiveMode] = useState<EditMode>('crop');
	const [showAIDialog, setShowAIDialog] = useState(false);
	const [isProcessingAI, setIsProcessingAI] = useState(false);

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

	const handleSave = useCallback((): void => {
		const dataUri = exportDataUri();
		if (dataUri) {
			onSave(dataUri);
		}
	}, [exportDataUri, onSave]);

	const handleModeChange = useCallback(
		(mode: EditMode): void => {
			if (activeMode === 'crop' && mode !== 'crop') {
				resetCrop();
			}
			setActiveMode(mode);
		},
		[activeMode, resetCrop]
	);

	const handleAISubmit = useCallback(
		(prompt: string): void => {
			setIsProcessingAI(true);
			// Simulate processing delay for better UX
			setTimeout(() => {
				applyAI(prompt);
				setShowAIDialog(false);
				setIsProcessingAI(false);
			}, 300);
		},
		[applyAI]
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

						<div className="mx-1 h-4 w-px bg-border" />

						{/* AI Button */}
						<ToolbarButton
							icon={<Sparkles />}
							label="AI Transform"
							onClick={() => setShowAIDialog(true)}
							disabled={!state.isLoaded}
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
					</div>
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

			{/* AI Prompt Dialog */}
			<AIPromptDialog
				isOpen={showAIDialog}
				onClose={() => setShowAIDialog(false)}
				onSubmit={handleAISubmit}
				isProcessing={isProcessingAI}
			/>
		</div>
	);
}
