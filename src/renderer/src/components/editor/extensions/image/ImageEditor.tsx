import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	RotateCcw,
	RotateCw,
	Crop,
	Maximize2,
	RefreshCcw,
	Lock,
	Unlock,
	Undo2,
	Check,
	X,
	Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppButton } from '@/components/app/AppButton';
import {
	AppTooltip,
	AppTooltipTrigger,
	AppTooltipContent,
	AppTooltipProvider,
} from '@/components/app/AppTooltip';
import { useImageCanvas, type CropRegion } from './use-image-canvas';
import { AIPromptDialog } from './AIPromptDialog';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_CROP_SIZE = 4;
const MIN_DIMENSION = 1;
const MAX_DIMENSION = 8000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImageEditorProps {
	src: string;
	alt: string | null;
	onSave: (dataUri: string) => void;
	onCancel: () => void;
}

type EditMode = 'crop' | 'resize' | 'rotate';

interface PointerPosition {
	x: number;
	y: number;
}

// ---------------------------------------------------------------------------
// CropOverlay sub-component
// ---------------------------------------------------------------------------

interface CropOverlayProps {
	canvasWidth: number;
	canvasHeight: number;
	cropRegion: CropRegion | null;
	onCropChange: (region: CropRegion | null) => void;
}

function CropOverlay({
	canvasWidth,
	canvasHeight,
	cropRegion,
	onCropChange,
}: CropOverlayProps): React.JSX.Element {
	const isDraggingRef = useRef(false);
	const startPosRef = useRef<PointerPosition>({ x: 0, y: 0 });
	const overlayRef = useRef<HTMLDivElement>(null);

	const clamp = useCallback(
		(value: number, min: number, max: number): number => Math.min(Math.max(value, min), max),
		[]
	);

	const getRelativePosition = useCallback(
		(clientX: number, clientY: number): PointerPosition => {
			const overlay = overlayRef.current;
			if (!overlay) return { x: 0, y: 0 };
			const rect = overlay.getBoundingClientRect();
			const scaleX = canvasWidth / rect.width;
			const scaleY = canvasHeight / rect.height;
			return {
				x: clamp((clientX - rect.left) * scaleX, 0, canvasWidth),
				y: clamp((clientY - rect.top) * scaleY, 0, canvasHeight),
			};
		},
		[canvasWidth, canvasHeight, clamp]
	);

	const handlePointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>): void => {
			e.currentTarget.setPointerCapture(e.pointerId);
			isDraggingRef.current = true;
			const pos = getRelativePosition(e.clientX, e.clientY);
			startPosRef.current = pos;
			onCropChange({ x: pos.x, y: pos.y, width: 0, height: 0 });
		},
		[getRelativePosition, onCropChange]
	);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent<HTMLDivElement>): void => {
			if (!isDraggingRef.current) return;
			const current = getRelativePosition(e.clientX, e.clientY);
			const start = startPosRef.current;
			const x = Math.min(start.x, current.x);
			const y = Math.min(start.y, current.y);
			const width = Math.abs(current.x - start.x);
			const height = Math.abs(current.y - start.y);
			onCropChange({ x, y, width, height });
		},
		[getRelativePosition, onCropChange]
	);

	const handlePointerUp = useCallback(
		(e: React.PointerEvent<HTMLDivElement>): void => {
			e.currentTarget.releasePointerCapture(e.pointerId);
			isDraggingRef.current = false;
			if (cropRegion && (cropRegion.width < MIN_CROP_SIZE || cropRegion.height < MIN_CROP_SIZE)) {
				onCropChange(null);
			}
		},
		[cropRegion, onCropChange]
	);

	const selectionStyle = useMemo((): React.CSSProperties => {
		if (!cropRegion || canvasWidth === 0 || canvasHeight === 0) return { display: 'none' };
		return {
			left: `${(cropRegion.x / canvasWidth) * 100}%`,
			top: `${(cropRegion.y / canvasHeight) * 100}%`,
			width: `${(cropRegion.width / canvasWidth) * 100}%`,
			height: `${(cropRegion.height / canvasHeight) * 100}%`,
		};
	}, [cropRegion, canvasWidth, canvasHeight]);

	const hasSelection =
		cropRegion !== null && cropRegion.width >= MIN_CROP_SIZE && cropRegion.height >= MIN_CROP_SIZE;

	return (
		<div
			ref={overlayRef}
			className="absolute inset-0 cursor-crosshair"
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			role="presentation"
			aria-label="Crop selection area"
		>
			{hasSelection && (
				<>
					{/* Top */}
					<div
						className="absolute inset-x-0 top-0 bg-black/50"
						style={{ height: `${(cropRegion.y / canvasHeight) * 100}%` }}
					/>
					{/* Bottom */}
					<div
						className="absolute inset-x-0 bottom-0 bg-black/50"
						style={{
							top: `${((cropRegion.y + cropRegion.height) / canvasHeight) * 100}%`,
						}}
					/>
					{/* Left */}
					<div
						className="absolute bg-black/50"
						style={{
							top: `${(cropRegion.y / canvasHeight) * 100}%`,
							left: 0,
							width: `${(cropRegion.x / canvasWidth) * 100}%`,
							height: `${(cropRegion.height / canvasHeight) * 100}%`,
						}}
					/>
					{/* Right */}
					<div
						className="absolute bg-black/50"
						style={{
							top: `${(cropRegion.y / canvasHeight) * 100}%`,
							left: `${((cropRegion.x + cropRegion.width) / canvasWidth) * 100}%`,
							right: 0,
							height: `${(cropRegion.height / canvasHeight) * 100}%`,
						}}
					/>

					{/* Selection border + handles */}
					<div
						className="pointer-events-none absolute box-border border-2 border-white"
						style={selectionStyle}
					>
						{(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
							<div
								key={corner}
								className={cn(
									'absolute h-3 w-3 rounded-sm border-2 border-white bg-white/90 shadow',
									corner === 'tl' && '-left-1.5 -top-1.5',
									corner === 'tr' && '-right-1.5 -top-1.5',
									corner === 'bl' && '-bottom-1.5 -left-1.5',
									corner === 'br' && '-bottom-1.5 -right-1.5'
								)}
							/>
						))}
						<div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-sm border-2 border-white bg-white/90 shadow" />
						<div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-sm border-2 border-white bg-white/90 shadow" />
						<div className="absolute left-[-6px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-sm border-2 border-white bg-white/90 shadow" />
						<div className="absolute right-[-6px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-sm border-2 border-white bg-white/90 shadow" />
					</div>
				</>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// ResizeControls sub-component
// ---------------------------------------------------------------------------

interface ResizeControlsProps {
	currentWidth: number;
	currentHeight: number;
	onApply: (width: number, height: number) => void;
}

function ResizeControls({
	currentWidth,
	currentHeight,
	onApply,
}: ResizeControlsProps): React.JSX.Element {
	const { t } = useTranslation();
	const [widthInput, setWidthInput] = useState(String(currentWidth));
	const [heightInput, setHeightInput] = useState(String(currentHeight));
	const [isLocked, setIsLocked] = useState(true);
	const aspectRatioRef = useRef(currentWidth / currentHeight);

	useEffect(() => {
		setWidthInput(String(currentWidth));
		setHeightInput(String(currentHeight));
		if (currentHeight > 0) {
			aspectRatioRef.current = currentWidth / currentHeight;
		}
	}, [currentWidth, currentHeight]);

	const clampDimension = useCallback(
		(value: number): number => Math.round(Math.min(Math.max(value, MIN_DIMENSION), MAX_DIMENSION)),
		[]
	);

	const handleWidthChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>): void => {
			const raw = e.target.value;
			setWidthInput(raw);
			const parsed = parseInt(raw, 10);
			if (!isNaN(parsed) && isLocked) {
				const newHeight = clampDimension(parsed / aspectRatioRef.current);
				setHeightInput(String(newHeight));
			}
		},
		[isLocked, clampDimension]
	);

	const handleHeightChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>): void => {
			const raw = e.target.value;
			setHeightInput(raw);
			const parsed = parseInt(raw, 10);
			if (!isNaN(parsed) && isLocked) {
				const newWidth = clampDimension(parsed * aspectRatioRef.current);
				setWidthInput(String(newWidth));
			}
		},
		[isLocked, clampDimension]
	);

	const handleApply = useCallback((): void => {
		const w = clampDimension(parseInt(widthInput, 10) || currentWidth);
		const h = clampDimension(parseInt(heightInput, 10) || currentHeight);
		onApply(w, h);
	}, [widthInput, heightInput, currentWidth, currentHeight, clampDimension, onApply]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>): void => {
			if (e.key === 'Enter') handleApply();
		},
		[handleApply]
	);

	const toggleLock = useCallback((): void => {
		if (!isLocked && currentHeight > 0) {
			aspectRatioRef.current = currentWidth / currentHeight;
		}
		setIsLocked((prev) => !prev);
	}, [isLocked, currentWidth, currentHeight]);

	return (
		<div className="flex flex-wrap items-end gap-2">
			<div className="flex flex-col gap-1">
				<label className="text-xs text-muted-foreground" htmlFor="resize-width">
					{t('imageNode.width')}
				</label>
				<input
					id="resize-width"
					type="number"
					min={MIN_DIMENSION}
					max={MAX_DIMENSION}
					value={widthInput}
					onChange={handleWidthChange}
					onKeyDown={handleKeyDown}
					className="h-7 w-20 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				/>
			</div>

			<AppTooltip>
				<AppTooltipTrigger asChild>
					<AppButton
						variant="ghost"
						size="icon-xs"
						aria-label={
							isLocked ? t('imageNode.unlockAspectRatio') : t('imageNode.lockAspectRatio')
						}
						onClick={toggleLock}
						className="mb-0.5"
					>
						{isLocked ? <Lock /> : <Unlock />}
					</AppButton>
				</AppTooltipTrigger>
				<AppTooltipContent side="top" className="px-2 py-1 text-xs">
					{isLocked ? t('imageNode.unlockAspectRatio') : t('imageNode.lockAspectRatio')}
				</AppTooltipContent>
			</AppTooltip>

			<div className="flex flex-col gap-1">
				<label className="text-xs text-muted-foreground" htmlFor="resize-height">
					{t('imageNode.height')}
				</label>
				<input
					id="resize-height"
					type="number"
					min={MIN_DIMENSION}
					max={MAX_DIMENSION}
					value={heightInput}
					onChange={handleHeightChange}
					onKeyDown={handleKeyDown}
					className="h-7 w-20 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				/>
			</div>

			<AppButton size="sm" onClick={handleApply} className="mb-0.5 h-7 px-2 text-xs">
				{t('imageNode.resize')}
			</AppButton>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Inline toolbar button
// ---------------------------------------------------------------------------

interface ToolbarButtonProps {
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
	active?: boolean;
	disabled?: boolean;
}

function ToolbarButton({
	icon,
	label,
	onClick,
	active,
	disabled,
}: ToolbarButtonProps): React.JSX.Element {
	return (
		<AppTooltip>
			<AppTooltipTrigger asChild>
				<AppButton
					variant="ghost"
					size="icon-xs"
					aria-label={label}
					onClick={onClick}
					disabled={disabled}
					className={cn(
						'h-6 w-6 text-muted-foreground hover:text-foreground [&_svg]:h-3.5 [&_svg]:w-3.5',
						active && 'bg-accent text-foreground'
					)}
				>
					{icon}
				</AppButton>
			</AppTooltipTrigger>
			<AppTooltipContent side="top" sideOffset={4} className="px-2 py-1 text-xs">
				{label}
			</AppTooltipContent>
		</AppTooltip>
	);
}

// ---------------------------------------------------------------------------
// ImageEditor (inline component)
// ---------------------------------------------------------------------------

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
				<div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
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

			{/* Bottom controls — mode-specific */}
			<AppTooltipProvider delayDuration={300}>
				<div className="flex items-center gap-2 border-t border-border px-2 py-1.5">
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
			</AppTooltipProvider>
		</div>
	);
}
