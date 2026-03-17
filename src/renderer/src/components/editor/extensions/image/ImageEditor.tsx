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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppButton } from '@/components/app/AppButton';
import {
	AppTooltip,
	AppTooltipTrigger,
	AppTooltipContent,
	AppTooltipProvider,
} from '@/components/app/AppTooltip';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/Dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { useImageCanvas, type CropRegion } from './use-image-canvas';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_CROP_SIZE = 4;
const MIN_DIMENSION = 1;
const MAX_DIMENSION = 8000;
const CANVAS_CONTAINER_MAX_H = 480;

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
			// Clear region if too small to be meaningful
			if (cropRegion && (cropRegion.width < MIN_CROP_SIZE || cropRegion.height < MIN_CROP_SIZE)) {
				onCropChange(null);
			}
		},
		[cropRegion, onCropChange]
	);

	// Compute overlay cutout positions as percentages for CSS
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
			{/* Darkened overlay covering everything outside the selection */}
			{hasSelection && (
				<>
					{/* Top */}
					<div
						className="absolute inset-x-0 top-0 bg-black/50"
						style={{ height: `${(cropRegion!.y / canvasHeight) * 100}%` }}
					/>
					{/* Bottom */}
					<div
						className="absolute inset-x-0 bottom-0 bg-black/50"
						style={{
							top: `${((cropRegion!.y + cropRegion!.height) / canvasHeight) * 100}%`,
						}}
					/>
					{/* Left */}
					<div
						className="absolute bg-black/50"
						style={{
							top: `${(cropRegion!.y / canvasHeight) * 100}%`,
							left: 0,
							width: `${(cropRegion!.x / canvasWidth) * 100}%`,
							height: `${(cropRegion!.height / canvasHeight) * 100}%`,
						}}
					/>
					{/* Right */}
					<div
						className="absolute bg-black/50"
						style={{
							top: `${(cropRegion!.y / canvasHeight) * 100}%`,
							left: `${((cropRegion!.x + cropRegion!.width) / canvasWidth) * 100}%`,
							right: 0,
							height: `${(cropRegion!.height / canvasHeight) * 100}%`,
						}}
					/>

					{/* Selection border + corner handles */}
					<div
						className="pointer-events-none absolute box-border border-2 border-white"
						style={selectionStyle}
					>
						{/* Corner handles */}
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
						{/* Edge handles */}
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

	// Sync inputs when dimensions change externally (e.g. after crop/rotation)
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
		<div className="flex flex-wrap items-end gap-3 px-4 py-3">
			{/* Width */}
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
					className="h-8 w-24 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				/>
			</div>

			{/* Lock/Unlock aspect ratio */}
			<AppTooltip>
				<AppTooltipTrigger asChild>
					<AppButton
						variant="ghost"
						size="icon"
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

			{/* Height */}
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
					className="h-8 w-24 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				/>
			</div>

			<AppButton size="sm" onClick={handleApply} className="mb-0.5">
				{t('imageNode.resize')}
			</AppButton>
		</div>
	);
}

// ---------------------------------------------------------------------------
// ImageEditor (main component)
// ---------------------------------------------------------------------------

export function ImageEditor({ src, alt, onSave, onCancel }: ImageEditorProps): React.JSX.Element {
	const { t } = useTranslation();
	const [activeMode, setActiveMode] = useState<EditMode>('crop');

	const {
		canvasRef,
		state,
		applyRotation,
		applyCrop,
		resetCrop,
		setCropRegion,
		applyResize,
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

	const handleApplyCrop = useCallback((): void => {
		applyCrop();
	}, [applyCrop]);

	const handleResetCrop = useCallback((): void => {
		resetCrop();
	}, [resetCrop]);

	const handleRotateLeft = useCallback((): void => {
		applyRotation('left');
	}, [applyRotation]);

	const handleRotateRight = useCallback((): void => {
		applyRotation('right');
	}, [applyRotation]);

	const handleModeChange = useCallback(
		(mode: string): void => {
			// Clear crop selection when leaving crop mode
			if (activeMode === 'crop' && mode !== 'crop') {
				resetCrop();
			}
			setActiveMode(mode as EditMode);
		},
		[activeMode, resetCrop]
	);

	const handleResize = useCallback(
		(width: number, height: number): void => {
			applyResize(width, height);
		},
		[applyResize]
	);

	const currentWidth = state.dimensions?.width ?? 0;
	const currentHeight = state.dimensions?.height ?? 0;
	const hasCropSelection =
		state.cropRegion !== null &&
		state.cropRegion.width >= MIN_CROP_SIZE &&
		state.cropRegion.height >= MIN_CROP_SIZE;

	// The canvas display is scaled to fit the container while preserving aspect ratio.
	const canvasContainerStyle = useMemo((): React.CSSProperties => {
		if (!state.dimensions) return {};
		const { width, height } = state.dimensions;
		if (width === 0 || height === 0) return {};
		return {
			aspectRatio: `${width} / ${height}`,
			maxHeight: CANVAS_CONTAINER_MAX_H,
		};
	}, [state.dimensions]);

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onCancel();
			}}
		>
			<DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
				{/* Header */}
				<DialogHeader className="shrink-0 border-b px-6 py-4">
					<div className="flex items-center justify-between">
						<DialogTitle>
							{t('imageNode.editTitle')}
							{alt ? (
								<span className="ml-2 text-sm font-normal text-muted-foreground">— {alt}</span>
							) : null}
						</DialogTitle>
						<AppTooltipProvider delayDuration={300}>
							<AppTooltip>
								<AppTooltipTrigger asChild>
									<AppButton
										variant="ghost"
										size="icon"
										aria-label="Undo"
										onClick={undo}
										disabled={!canUndo}
									>
										<Undo2 />
									</AppButton>
								</AppTooltipTrigger>
								<AppTooltipContent side="bottom" className="px-2 py-1 text-xs">
									Undo
								</AppTooltipContent>
							</AppTooltip>
						</AppTooltipProvider>
					</div>
				</DialogHeader>

				{/* Mode tabs + controls */}
				<Tabs
					value={activeMode}
					onValueChange={handleModeChange}
					className="flex min-h-0 flex-1 flex-col overflow-hidden"
				>
					<TabsList className="shrink-0">
						<TabsTrigger value="crop">
							<span className="flex items-center gap-1.5">
								<Crop className="h-3.5 w-3.5" />
								{t('imageNode.crop')}
							</span>
						</TabsTrigger>
						<TabsTrigger value="resize">
							<span className="flex items-center gap-1.5">
								<Maximize2 className="h-3.5 w-3.5" />
								{t('imageNode.resize')}
							</span>
						</TabsTrigger>
						<TabsTrigger value="rotate">
							<span className="flex items-center gap-1.5">
								<RefreshCcw className="h-3.5 w-3.5" />
								{t('imageNode.rotate')}
							</span>
						</TabsTrigger>
					</TabsList>

					{/* Canvas area — shared across all modes */}
					<div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-muted/30 p-4">
						{state.hasError && (
							<div className="text-sm text-destructive">Failed to load image for editing.</div>
						)}
						{!state.hasError && (
							<div className="relative inline-block" style={canvasContainerStyle}>
								<canvas
									ref={canvasRef}
									className="block max-h-full max-w-full"
									aria-label={alt ?? 'Image being edited'}
								/>
								{/* Crop overlay only when in crop mode and image is loaded */}
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

					{/* Mode-specific bottom toolbars */}
					<TabsContent value="crop" className="shrink-0 border-t">
						<div className="flex items-center gap-2 px-4 py-3">
							<AppButton size="sm" onClick={handleApplyCrop} disabled={!hasCropSelection}>
								{t('imageNode.applyCrop')}
							</AppButton>
							<AppButton
								variant="outline"
								size="sm"
								onClick={handleResetCrop}
								disabled={!state.cropRegion}
							>
								{t('imageNode.resetCrop')}
							</AppButton>
							<p className="ml-2 text-xs text-muted-foreground">
								{hasCropSelection
									? `${Math.round(state.cropRegion!.width)} × ${Math.round(state.cropRegion!.height)} px`
									: 'Click and drag to select crop area'}
							</p>
						</div>
					</TabsContent>

					<TabsContent value="resize" className="shrink-0 border-t">
						<AppTooltipProvider delayDuration={300}>
							{state.isLoaded && (
								<ResizeControls
									currentWidth={currentWidth}
									currentHeight={currentHeight}
									onApply={handleResize}
								/>
							)}
						</AppTooltipProvider>
					</TabsContent>

					<TabsContent value="rotate" className="shrink-0 border-t">
						<div className="flex items-center gap-3 px-4 py-3">
							<AppTooltipProvider delayDuration={300}>
								<AppTooltip>
									<AppTooltipTrigger asChild>
										<AppButton
											variant="outline"
											size="sm"
											aria-label={t('imageNode.rotateLeft')}
											onClick={handleRotateLeft}
											disabled={!state.isLoaded}
										>
											<RotateCcw className="mr-1.5 h-4 w-4" />
											{t('imageNode.rotateLeft')}
										</AppButton>
									</AppTooltipTrigger>
									<AppTooltipContent side="top" className="px-2 py-1 text-xs">
										{t('imageNode.rotateLeft')}
									</AppTooltipContent>
								</AppTooltip>

								<AppTooltip>
									<AppTooltipTrigger asChild>
										<AppButton
											variant="outline"
											size="sm"
											aria-label={t('imageNode.rotateRight')}
											onClick={handleRotateRight}
											disabled={!state.isLoaded}
										>
											<RotateCw className="mr-1.5 h-4 w-4" />
											{t('imageNode.rotateRight')}
										</AppButton>
									</AppTooltipTrigger>
									<AppTooltipContent side="top" className="px-2 py-1 text-xs">
										{t('imageNode.rotateRight')}
									</AppTooltipContent>
								</AppTooltip>
							</AppTooltipProvider>

							<span className="text-xs text-muted-foreground">{state.rotation}°</span>
						</div>
					</TabsContent>
				</Tabs>

				{/* Footer */}
				<DialogFooter className="shrink-0 border-t px-6 py-4">
					<AppButton variant="outline" onClick={onCancel}>
						{t('imageNode.cancel')}
					</AppButton>
					<AppButton onClick={handleSave} disabled={!state.isLoaded}>
						{t('imageNode.save')}
					</AppButton>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
