import { useCallback, useEffect, useRef, useState } from 'react';
import { detectFiltersFromPrompt, applyFiltersToCanvas } from './ai-filters';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROTATION_STEP_DEG = 90;
const FULL_ROTATION_DEG = 360;
const OUTPUT_QUALITY = 1.0;
const OUTPUT_MIME_TYPE = 'image/png';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CropRegion {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface CanvasDimensions {
	width: number;
	height: number;
}

export interface ImageCanvasState {
	rotation: number;
	cropRegion: CropRegion | null;
	dimensions: CanvasDimensions | null;
	isLoaded: boolean;
	hasError: boolean;
}

export interface UseImageCanvasReturn {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	state: ImageCanvasState;
	applyRotation: (direction: 'left' | 'right') => void;
	applyCrop: () => void;
	resetCrop: () => void;
	setCropRegion: (region: CropRegion | null) => void;
	applyResize: (width: number, height: number) => void;
	applyAI: (prompt: string) => void;
	undo: () => void;
	canUndo: boolean;
	exportDataUri: () => string | null;
}

// ---------------------------------------------------------------------------
// Snapshot stored in the undo stack
// ---------------------------------------------------------------------------

interface CanvasSnapshot {
	imageData: ImageData;
	rotation: number;
	width: number;
	height: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function loadImageElement(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = (): void => resolve(img);
		img.onerror = (): void => reject(new Error(`Failed to load image: ${src}`));
		img.src = src;
	});
}

function drawRotatedImage(
	ctx: CanvasRenderingContext2D,
	img: HTMLImageElement | HTMLCanvasElement,
	rotationDeg: number
): { width: number; height: number } {
	const radians = (rotationDeg * Math.PI) / 180;
	const sin = Math.abs(Math.sin(radians));
	const cos = Math.abs(Math.cos(radians));

	const srcW = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
	const srcH = img instanceof HTMLImageElement ? img.naturalHeight : img.height;

	const outW = Math.round(srcW * cos + srcH * sin);
	const outH = Math.round(srcW * sin + srcH * cos);

	const canvas = ctx.canvas;
	canvas.width = outW;
	canvas.height = outH;

	ctx.save();
	ctx.translate(outW / 2, outH / 2);
	ctx.rotate(radians);
	ctx.drawImage(img, -srcW / 2, -srcH / 2, srcW, srcH);
	ctx.restore();

	return { width: outW, height: outH };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useImageCanvas(src: string): UseImageCanvasReturn {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const originalImgRef = useRef<HTMLImageElement | null>(null);

	const [state, setState] = useState<ImageCanvasState>({
		rotation: 0,
		cropRegion: null,
		dimensions: null,
		isLoaded: false,
		hasError: false,
	});

	const undoStackRef = useRef<CanvasSnapshot[]>([]);

	// ---------------------------------------------------------------------------
	// Snapshot helpers
	// ---------------------------------------------------------------------------

	const pushSnapshot = useCallback((rotation: number): void => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		undoStackRef.current = [
			...undoStackRef.current,
			{ imageData, rotation, width: canvas.width, height: canvas.height },
		];
	}, []);

	const restoreSnapshot = useCallback((snapshot: CanvasSnapshot): void => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		canvas.width = snapshot.width;
		canvas.height = snapshot.height;
		ctx.putImageData(snapshot.imageData, 0, 0);

		setState((prev) => ({
			...prev,
			rotation: snapshot.rotation,
			dimensions: { width: snapshot.width, height: snapshot.height },
		}));
	}, []);

	// ---------------------------------------------------------------------------
	// Initial load
	// ---------------------------------------------------------------------------

	useEffect(() => {
		let cancelled = false;

		const canvas = canvasRef.current;
		if (!canvas) return;

		loadImageElement(src)
			.then((img) => {
				if (cancelled) return;

				originalImgRef.current = img;
				undoStackRef.current = [];

				const ctx = canvas.getContext('2d');
				if (!ctx) return;

				canvas.width = img.naturalWidth;
				canvas.height = img.naturalHeight;
				ctx.drawImage(img, 0, 0);

				setState({
					rotation: 0,
					cropRegion: null,
					dimensions: { width: img.naturalWidth, height: img.naturalHeight },
					isLoaded: true,
					hasError: false,
				});
			})
			.catch(() => {
				if (cancelled) return;
				setState((prev) => ({ ...prev, hasError: true }));
			});

		return (): void => {
			cancelled = true;
		};
	}, [src]);

	// ---------------------------------------------------------------------------
	// Rotation
	// ---------------------------------------------------------------------------

	const applyRotation = useCallback(
		(direction: 'left' | 'right'): void => {
			const canvas = canvasRef.current;
			if (!canvas) return;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;

			// Snapshot before mutation
			pushSnapshot(state.rotation);

			const delta = direction === 'right' ? ROTATION_STEP_DEG : -ROTATION_STEP_DEG;
			const nextRotation =
				(((state.rotation + delta) % FULL_ROTATION_DEG) + FULL_ROTATION_DEG) % FULL_ROTATION_DEG;

			// Draw current canvas content rotated onto an offscreen canvas
			const offscreen = document.createElement('canvas');
			const offCtx = offscreen.getContext('2d');
			if (!offCtx) return;

			// Copy current canvas to offscreen
			offscreen.width = canvas.width;
			offscreen.height = canvas.height;
			offCtx.drawImage(canvas, 0, 0);

			// Rotate and apply back to main canvas
			const { width, height } = drawRotatedImage(ctx, offscreen, delta);

			setState((prev) => ({
				...prev,
				rotation: nextRotation,
				dimensions: { width, height },
			}));
		},
		[state.rotation, pushSnapshot]
	);

	// ---------------------------------------------------------------------------
	// Crop
	// ---------------------------------------------------------------------------

	const setCropRegion = useCallback((region: CropRegion | null): void => {
		setState((prev) => ({ ...prev, cropRegion: region }));
	}, []);

	const applyCrop = useCallback((): void => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const { cropRegion } = state;
		if (!cropRegion) return;

		const { x, y, width, height } = cropRegion;
		if (width <= 0 || height <= 0) return;

		// Snapshot before mutation
		pushSnapshot(state.rotation);

		const imageData = ctx.getImageData(x, y, width, height);

		canvas.width = width;
		canvas.height = height;
		ctx.putImageData(imageData, 0, 0);

		setState((prev) => ({
			...prev,
			cropRegion: null,
			dimensions: { width, height },
		}));
	}, [state, pushSnapshot]);

	const resetCrop = useCallback((): void => {
		setState((prev) => ({ ...prev, cropRegion: null }));
	}, []);

	// ---------------------------------------------------------------------------
	// Resize
	// ---------------------------------------------------------------------------

	const applyResize = useCallback(
		(width: number, height: number): void => {
			const canvas = canvasRef.current;
			if (!canvas) return;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;

			if (width <= 0 || height <= 0) return;

			// Snapshot before mutation
			pushSnapshot(state.rotation);

			const offscreen = document.createElement('canvas');
			const offCtx = offscreen.getContext('2d');
			if (!offCtx) return;

			offscreen.width = canvas.width;
			offscreen.height = canvas.height;
			offCtx.drawImage(canvas, 0, 0);

			canvas.width = width;
			canvas.height = height;
			ctx.drawImage(offscreen, 0, 0, offscreen.width, offscreen.height, 0, 0, width, height);

			setState((prev) => ({
				...prev,
				dimensions: { width, height },
			}));
		},
		[state.rotation, pushSnapshot]
	);

	// ---------------------------------------------------------------------------
	// Undo
	// ---------------------------------------------------------------------------

	const canUndo = undoStackRef.current.length > 0;

	const undo = useCallback((): void => {
		const stack = undoStackRef.current;
		if (stack.length === 0) return;

		const snapshot = stack[stack.length - 1];
		undoStackRef.current = stack.slice(0, -1);
		restoreSnapshot(snapshot);
	}, [restoreSnapshot]);

	// ---------------------------------------------------------------------------
	// Export
	// ---------------------------------------------------------------------------

	const exportDataUri = useCallback((): string | null => {
		const canvas = canvasRef.current;
		if (!canvas) return null;
		return canvas.toDataURL(OUTPUT_MIME_TYPE, OUTPUT_QUALITY);
	}, []);

	return {
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
	};
}
