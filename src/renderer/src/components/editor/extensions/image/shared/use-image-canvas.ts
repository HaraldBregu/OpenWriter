import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROTATION_STEP_DEG = 90;
const FULL_ROTATION_DEG = 360;
const OUTPUT_QUALITY = 1.0;
const OUTPUT_MIME_TYPE = 'image/png';

// ---------------------------------------------------------------------------
// AI Filter helpers (inlined)
// ---------------------------------------------------------------------------

const BLUR_KERNEL = [
	[1, 2, 1],
	[2, 4, 2],
	[1, 2, 1],
];

const SHARPEN_KERNEL = [
	[0, -1, 0],
	[-1, 5, -1],
	[0, -1, 0],
];

interface DetectedFilter {
	type: string;
	intensity?: number;
}

function applyConvolutionFilter(imageData: ImageData, kernel: number[][], divisor = 16): ImageData {
	const { data, width, height } = imageData;
	const output = new Uint8ClampedArray(data.length);
	const kh = kernel.length;
	const kw = kernel[0].length;
	const kx = Math.floor(kw / 2);
	const ky = Math.floor(kh / 2);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let r = 0;
			let g = 0;
			let b = 0;
			for (let ky_i = 0; ky_i < kh; ky_i++) {
				for (let kx_i = 0; kx_i < kw; kx_i++) {
					const px = Math.min(width - 1, Math.max(0, x + kx_i - kx));
					const py = Math.min(height - 1, Math.max(0, y + ky_i - ky));
					const idx = (py * width + px) * 4;
					const weight = kernel[ky_i][kx_i];
					r += data[idx] * weight;
					g += data[idx + 1] * weight;
					b += data[idx + 2] * weight;
				}
			}
			const idx = (y * width + x) * 4;
			output[idx] = Math.min(255, Math.max(0, Math.round(r / divisor)));
			output[idx + 1] = Math.min(255, Math.max(0, Math.round(g / divisor)));
			output[idx + 2] = Math.min(255, Math.max(0, Math.round(b / divisor)));
			output[idx + 3] = data[idx + 3];
		}
	}
	return new ImageData(output, width, height);
}

function applyGrayscaleFilter(imageData: ImageData): ImageData {
	const { data } = imageData;
	const output = new Uint8ClampedArray(data.length);
	for (let i = 0; i < data.length; i += 4) {
		const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
		output[i] = gray;
		output[i + 1] = gray;
		output[i + 2] = gray;
		output[i + 3] = data[i + 3];
	}
	return new ImageData(output, imageData.width, imageData.height);
}

function applyBlurFilter(imageData: ImageData, iterations = 1): ImageData {
	let result = imageData;
	for (let i = 0; i < iterations; i++) {
		result = applyConvolutionFilter(result, BLUR_KERNEL, 16);
	}
	return result;
}

function applySharpenFilter(imageData: ImageData): ImageData {
	return applyConvolutionFilter(imageData, SHARPEN_KERNEL, 1);
}

function applyBrightnessFilter(imageData: ImageData, amount = 30): ImageData {
	const { data } = imageData;
	const output = new Uint8ClampedArray(data.length);
	for (let i = 0; i < data.length; i += 4) {
		output[i] = Math.min(255, Math.max(0, data[i] + amount));
		output[i + 1] = Math.min(255, Math.max(0, data[i + 1] + amount));
		output[i + 2] = Math.min(255, Math.max(0, data[i + 2] + amount));
		output[i + 3] = data[i + 3];
	}
	return new ImageData(output, imageData.width, imageData.height);
}

function applySaturationFilter(imageData: ImageData, amount = 1.3): ImageData {
	const { data } = imageData;
	const output = new Uint8ClampedArray(data.length);
	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const l = (max + min) / 2 / 255;
		let h = 0;
		let s = 0;
		if (max !== min) {
			const d = max - min;
			s = l > 0.5 ? d / (510 - max - min) : d / (max + min);
			if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
			else if (max === g) h = (b - r) / d + 2;
			else h = (r - g) / d + 4;
			h /= 6;
		}
		s = Math.min(1, s * amount);
		const c = (1 - Math.abs(2 * l - 1)) * s;
		const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
		let r2 = 0;
		let g2 = 0;
		let b2 = 0;
		if (h < 1 / 6) [r2, g2, b2] = [c, x, 0];
		else if (h < 2 / 6) [r2, g2, b2] = [x, c, 0];
		else if (h < 3 / 6) [r2, g2, b2] = [0, c, x];
		else if (h < 4 / 6) [r2, g2, b2] = [0, x, c];
		else if (h < 5 / 6) [r2, g2, b2] = [x, 0, c];
		else [r2, g2, b2] = [c, 0, x];
		const m = l - c / 2;
		output[i] = Math.round((r2 + m) * 255);
		output[i + 1] = Math.round((g2 + m) * 255);
		output[i + 2] = Math.round((b2 + m) * 255);
		output[i + 3] = data[i + 3];
	}
	return new ImageData(output, imageData.width, imageData.height);
}

function applySepiaFilter(imageData: ImageData): ImageData {
	const { data } = imageData;
	const output = new Uint8ClampedArray(data.length);
	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		output[i] = Math.min(255, Math.max(0, Math.round(r * 0.393 + g * 0.769 + b * 0.189)));
		output[i + 1] = Math.min(255, Math.max(0, Math.round(r * 0.349 + g * 0.686 + b * 0.168)));
		output[i + 2] = Math.min(255, Math.max(0, Math.round(r * 0.272 + g * 0.534 + b * 0.131)));
		output[i + 3] = data[i + 3];
	}
	return new ImageData(output, imageData.width, imageData.height);
}

function applyInvertFilter(imageData: ImageData): ImageData {
	const { data } = imageData;
	const output = new Uint8ClampedArray(data.length);
	for (let i = 0; i < data.length; i += 4) {
		output[i] = 255 - data[i];
		output[i + 1] = 255 - data[i + 1];
		output[i + 2] = 255 - data[i + 2];
		output[i + 3] = data[i + 3];
	}
	return new ImageData(output, imageData.width, imageData.height);
}

function detectFiltersFromPrompt(prompt: string): DetectedFilter[] {
	const filters: DetectedFilter[] = [];
	if (/black\s*and\s*white|grayscale|black white|monochrome/i.test(prompt))
		filters.push({ type: 'grayscale' });
	if (/blur|soft|fuzzy/i.test(prompt)) filters.push({ type: 'blur', intensity: 2 });
	if (/bright|lighten|lighter/i.test(prompt)) filters.push({ type: 'brightness', intensity: 40 });
	if (/dark|darken|darker/i.test(prompt)) filters.push({ type: 'brightness', intensity: -40 });
	if (/vibrant|saturate|vivid|color|colorful/i.test(prompt))
		filters.push({ type: 'saturation', intensity: 1.5 });
	if (/sepia|warm|vintage|old/i.test(prompt)) filters.push({ type: 'sepia' });
	if (/invert|negative/i.test(prompt)) filters.push({ type: 'invert' });
	if (/sharp|sharpen|enhance|crisp|clear/i.test(prompt)) filters.push({ type: 'sharpen' });
	return filters;
}

function applyFiltersToCanvas(ctx: CanvasRenderingContext2D, filters: DetectedFilter[]): void {
	const canvas = ctx.canvas;
	let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	for (const filter of filters) {
		switch (filter.type) {
			case 'grayscale':
				imageData = applyGrayscaleFilter(imageData);
				break;
			case 'blur':
				imageData = applyBlurFilter(imageData, filter.intensity ?? 1);
				break;
			case 'sharpen':
				imageData = applySharpenFilter(imageData);
				break;
			case 'brightness':
				imageData = applyBrightnessFilter(imageData, filter.intensity ?? 30);
				break;
			case 'saturation':
				imageData = applySaturationFilter(imageData, filter.intensity ?? 1.3);
				break;
			case 'sepia':
				imageData = applySepiaFilter(imageData);
				break;
			case 'invert':
				imageData = applyInvertFilter(imageData);
				break;
		}
	}
	ctx.putImageData(imageData, 0, 0);
}

export type ImageEffectType = DetectedFilter['type'];

export type ImageEffectOption = {
	type: ImageEffectType;
	labelKey: string;
	descriptionKey?: string;
};

export const IMAGE_EFFECT_OPTIONS: ImageEffectOption[] = [
	{ type: 'grayscale', labelKey: 'imageNode.effectGrayscale' },
	{ type: 'blur', labelKey: 'imageNode.effectBlur' },
	{ type: 'brightness', labelKey: 'imageNode.effectBrightness' },
	{ type: 'saturation', labelKey: 'imageNode.effectSaturation' },
	{ type: 'sepia', labelKey: 'imageNode.effectSepia' },
	{ type: 'invert', labelKey: 'imageNode.effectInvert' },
	{ type: 'sharpen', labelKey: 'imageNode.effectSharpen' },
];

const EFFECT_DEFAULT_INTENSITIES: Partial<Record<ImageEffectType, number>> = {
	blur: 2,
	brightness: 40,
	saturation: 1.5,
};

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
	applyEffect: (effect: ImageEffectType) => void;
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
	// AI Filters
	// ---------------------------------------------------------------------------

const applyAI = useCallback(
	(prompt: string): void => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Snapshot before mutation
		pushSnapshot(state.rotation);

		// Detect filters from prompt and apply them
		const filters = detectFiltersFromPrompt(prompt);
		applyFiltersToCanvas(ctx, filters);
	},
	[state.rotation, pushSnapshot]
);

const applyEffect = useCallback(
	(effect: ImageEffectType): void => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Snapshot before mutation
		pushSnapshot(state.rotation);

		const intensity = EFFECT_DEFAULT_INTENSITIES[effect];
		const filter: DetectedFilter =
			intensity !== undefined
				? {
						type: effect,
						intensity,
				  }
				: {
						type: effect,
				  };

		applyFiltersToCanvas(ctx, [filter]);
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
		applyAI,
		applyEffect,
		undo,
		canUndo,
		exportDataUri,
	};
}
