import React, { useCallback, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { CropRegion } from '../use-image-canvas';
import { MIN_CROP_SIZE } from '../image-editor-constants';

interface PointerPosition {
	x: number;
	y: number;
}

interface CropOverlayProps {
	canvasWidth: number;
	canvasHeight: number;
	cropRegion: CropRegion | null;
	onCropChange: (region: CropRegion | null) => void;
}

export function CropOverlay({
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
					<div
						className="absolute inset-x-0 top-0 bg-black/50"
						style={{ height: `${(cropRegion.y / canvasHeight) * 100}%` }}
					/>
					<div
						className="absolute inset-x-0 bottom-0 bg-black/50"
						style={{
							top: `${((cropRegion.y + cropRegion.height) / canvasHeight) * 100}%`,
						}}
					/>
					<div
						className="absolute bg-black/50"
						style={{
							top: `${(cropRegion.y / canvasHeight) * 100}%`,
							left: 0,
							width: `${(cropRegion.x / canvasWidth) * 100}%`,
							height: `${(cropRegion.height / canvasHeight) * 100}%`,
						}}
					/>
					<div
						className="absolute bg-black/50"
						style={{
							top: `${(cropRegion.y / canvasHeight) * 100}%`,
							left: `${((cropRegion.x + cropRegion.width) / canvasWidth) * 100}%`,
							right: 0,
							height: `${(cropRegion.height / canvasHeight) * 100}%`,
						}}
					/>
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
