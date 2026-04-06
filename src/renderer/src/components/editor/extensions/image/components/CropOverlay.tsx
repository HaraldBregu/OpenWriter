import React, { useCallback, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { CropRegion } from '../shared/use-image-canvas';
import { MIN_CROP_SIZE } from '../shared';

const RULE_OF_THIRDS_DIVISIONS = 3;
const CORNER_HANDLE_OFFSET = '-6px';

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

type CornerKey = 'tl' | 'tr' | 'bl' | 'br';

const CORNER_CLASSES: Record<CornerKey, string> = {
	tl: '-left-1.5 -top-1.5',
	tr: '-right-1.5 -top-1.5',
	bl: '-bottom-1.5 -left-1.5',
	br: '-bottom-1.5 -right-1.5',
};

function RuleOfThirdsGrid(): React.JSX.Element {
	const lines: React.JSX.Element[] = [];
	for (let i = 1; i < RULE_OF_THIRDS_DIVISIONS; i++) {
		const pct = `${(i / RULE_OF_THIRDS_DIVISIONS) * 100}%`;
		lines.push(
			<div
				key={`v${i}`}
				className="absolute inset-y-0 w-px bg-white/30"
				style={{ left: pct }}
				aria-hidden="true"
			/>
		);
		lines.push(
			<div
				key={`h${i}`}
				className="absolute inset-x-0 h-px bg-white/30"
				style={{ top: pct }}
				aria-hidden="true"
			/>
		);
	}
	return <>{lines}</>;
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
			{hasSelection && cropRegion && (
				<>
					{/* Dark overlay: top */}
					<div
						className="absolute inset-x-0 top-0 bg-black/50"
						style={{ height: `${(cropRegion.y / canvasHeight) * 100}%` }}
					/>
					{/* Dark overlay: bottom */}
					<div
						className="absolute inset-x-0 bottom-0 bg-black/50"
						style={{
							top: `${((cropRegion.y + cropRegion.height) / canvasHeight) * 100}%`,
						}}
					/>
					{/* Dark overlay: left */}
					<div
						className="absolute bg-black/50"
						style={{
							top: `${(cropRegion.y / canvasHeight) * 100}%`,
							left: 0,
							width: `${(cropRegion.x / canvasWidth) * 100}%`,
							height: `${(cropRegion.height / canvasHeight) * 100}%`,
						}}
					/>
					{/* Dark overlay: right */}
					<div
						className="absolute bg-black/50"
						style={{
							top: `${(cropRegion.y / canvasHeight) * 100}%`,
							left: `${((cropRegion.x + cropRegion.width) / canvasWidth) * 100}%`,
							right: 0,
							height: `${(cropRegion.height / canvasHeight) * 100}%`,
						}}
					/>

					{/* Selection border + rule-of-thirds + handles */}
					<div
						className="pointer-events-none absolute box-border border border-white/80"
						style={selectionStyle}
					>
						{/* Rule-of-thirds grid */}
						<RuleOfThirdsGrid />

						{/* Corner handles */}
						{(Object.keys(CORNER_CLASSES) as CornerKey[]).map((corner) => (
							<div
								key={corner}
								className={cn(
									'absolute h-3 w-3 rounded-sm',
									'border-2 border-white bg-white shadow-md',
									CORNER_CLASSES[corner]
								)}
							/>
						))}

						{/* Edge handles: top-center */}
						<div
							className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-sm border-2 border-white bg-white shadow-md"
							style={{ top: CORNER_HANDLE_OFFSET }}
						/>
						{/* Edge handles: bottom-center */}
						<div
							className="absolute left-1/2 h-3 w-3 -translate-x-1/2 rounded-sm border-2 border-white bg-white shadow-md"
							style={{ bottom: CORNER_HANDLE_OFFSET }}
						/>
						{/* Edge handles: left-center */}
						<div
							className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-sm border-2 border-white bg-white shadow-md"
							style={{ left: CORNER_HANDLE_OFFSET }}
						/>
						{/* Edge handles: right-center */}
						<div
							className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-sm border-2 border-white bg-white shadow-md"
							style={{ right: CORNER_HANDLE_OFFSET }}
						/>
					</div>
				</>
			)}
		</div>
	);
}
