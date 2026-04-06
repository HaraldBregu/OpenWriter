/**
 * AI Filter utilities for example image transformations
 * These are demonstration filters based on keyword detection in user prompts
 */

// ---------------------------------------------------------------------------
// Constants
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

// ---------------------------------------------------------------------------
// Filter application helpers
// ---------------------------------------------------------------------------

function applyConvolutionFilter(
	imageData: ImageData,
	kernel: number[][],
	divisor: number = 16
): ImageData {
	const { data, width, height } = imageData;
	const output = new Uint8ClampedArray(data.length);

	const kw = kernel[0].length;
	const kh = kernel.length;
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
			output[idx + 3] = data[idx + 3]; // Alpha
		}
	}

	return new ImageData(output, width, height);
}

// ---------------------------------------------------------------------------
// Filter functions
// ---------------------------------------------------------------------------

export function applyGrayscaleFilter(imageData: ImageData): ImageData {
	const { data } = imageData;
	const output = new Uint8ClampedArray(data.length);

	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		// Luminance formula: 0.299*R + 0.587*G + 0.114*B
		const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
		output[i] = gray;
		output[i + 1] = gray;
		output[i + 2] = gray;
		output[i + 3] = data[i + 3]; // Alpha
	}

	return new ImageData(output, imageData.width, imageData.height);
}

export function applyBlurFilter(imageData: ImageData, iterations: number = 1): ImageData {
	let result = imageData;
	for (let i = 0; i < iterations; i++) {
		result = applyConvolutionFilter(result, BLUR_KERNEL, 16);
	}
	return result;
}

export function applySharpenFilter(imageData: ImageData): ImageData {
	return applyConvolutionFilter(imageData, SHARPEN_KERNEL, 1);
}

export function applyBrightnessFilter(imageData: ImageData, amount: number = 30): ImageData {
	const { data } = imageData;
	const output = new Uint8ClampedArray(data.length);

	for (let i = 0; i < data.length; i += 4) {
		output[i] = Math.min(255, Math.max(0, data[i] + amount));
		output[i + 1] = Math.min(255, Math.max(0, data[i + 1] + amount));
		output[i + 2] = Math.min(255, Math.max(0, data[i + 2] + amount));
		output[i + 3] = data[i + 3]; // Alpha
	}

	return new ImageData(output, imageData.width, imageData.height);
}

export function applySaturationFilter(imageData: ImageData, amount: number = 1.3): ImageData {
	const { data } = imageData;
	const output = new Uint8ClampedArray(data.length);

	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];

		// Convert RGB to HSL
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const l = (max + min) / 2 / 255;

		let h: number;
		let s: number;
		if (max === min) {
			h = s = 0;
		} else {
			const d = max - min;
			s = l > 0.5 ? d / (510 - max - min) : d / (max + min);
			switch (max) {
				case r:
					h = (g - b) / d + (g < b ? 6 : 0);
					break;
				case g:
					h = (b - r) / d + 2;
					break;
				case b:
					h = (r - g) / d + 4;
					break;
				default:
					h = 0;
			}
			h /= 6;
		}

		// Increase saturation
		s = Math.min(1, s * amount);

		// Convert back to RGB
		const c = (1 - Math.abs(2 * l - 1)) * s;
		const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
		let r2: number;
		let g2: number;
		let b2: number;

		if (h < 1 / 6) {
			[r2, g2, b2] = [c, x, 0];
		} else if (h < 2 / 6) {
			[r2, g2, b2] = [x, c, 0];
		} else if (h < 3 / 6) {
			[r2, g2, b2] = [0, c, x];
		} else if (h < 4 / 6) {
			[r2, g2, b2] = [0, x, c];
		} else if (h < 5 / 6) {
			[r2, g2, b2] = [x, 0, c];
		} else {
			[r2, g2, b2] = [c, 0, x];
		}

		const m = l - c / 2;
		output[i] = Math.round((r2 + m) * 255);
		output[i + 1] = Math.round((g2 + m) * 255);
		output[i + 2] = Math.round((b2 + m) * 255);
		output[i + 3] = data[i + 3]; // Alpha
	}

	return new ImageData(output, imageData.width, imageData.height);
}

export function applySepiaFilter(imageData: ImageData): ImageData {
	const { data } = imageData;
	const output = new Uint8ClampedArray(data.length);

	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];

		output[i] = Math.min(255, Math.max(0, Math.round(r * 0.393 + g * 0.769 + b * 0.189)));
		output[i + 1] = Math.min(255, Math.max(0, Math.round(r * 0.349 + g * 0.686 + b * 0.168)));
		output[i + 2] = Math.min(255, Math.max(0, Math.round(r * 0.272 + g * 0.534 + b * 0.131)));
		output[i + 3] = data[i + 3]; // Alpha
	}

	return new ImageData(output, imageData.width, imageData.height);
}

export function applyInvertFilter(imageData: ImageData): ImageData {
	const { data } = imageData;
	const output = new Uint8ClampedArray(data.length);

	for (let i = 0; i < data.length; i += 4) {
		output[i] = 255 - data[i];
		output[i + 1] = 255 - data[i + 1];
		output[i + 2] = 255 - data[i + 2];
		output[i + 3] = data[i + 3]; // Alpha
	}

	return new ImageData(output, imageData.width, imageData.height);
}

// ---------------------------------------------------------------------------
// Keyword detection and filter selection
// ---------------------------------------------------------------------------

interface DetectedFilter {
	type: string;
	intensity?: number;
}

export function detectFiltersFromPrompt(prompt: string): DetectedFilter[] {
	const lower = prompt.toLowerCase();
	const filters: DetectedFilter[] = [];

	// Grayscale / Black and white
	if (/black\s*and\s*white|grayscale|black white|monochrome/i.test(lower)) {
		filters.push({ type: 'grayscale' });
	}

	// Blur
	if (/blur|soft|fuzzy/i.test(lower)) {
		filters.push({ type: 'blur', intensity: 2 });
	}

	// Brightness
	if (/bright|lighten|lighter/i.test(lower)) {
		filters.push({ type: 'brightness', intensity: 40 });
	}

	// Darkness
	if (/dark|darken|darker/i.test(lower)) {
		filters.push({ type: 'brightness', intensity: -40 });
	}

	// Saturation / Vibrant
	if (/vibrant|saturate|vivid|color|colorful/i.test(lower)) {
		filters.push({ type: 'saturation', intensity: 1.5 });
	}

	// Sepia / Warm
	if (/sepia|warm|vintage|old/i.test(lower)) {
		filters.push({ type: 'sepia' });
	}

	// Invert
	if (/invert|negative/i.test(lower)) {
		filters.push({ type: 'invert' });
	}

	// Sharpen / Enhance
	if (/sharp|sharpen|enhance|crisp|clear/i.test(lower)) {
		filters.push({ type: 'sharpen' });
	}

	return filters;
}

// ---------------------------------------------------------------------------
// Batch filter application
// ---------------------------------------------------------------------------

export function applyFiltersToCanvas(
	ctx: CanvasRenderingContext2D,
	filters: DetectedFilter[]
): void {
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
