import type { PixelCrop } from 'react-image-crop';

export type EditMode = 'crop' | 'rotate' | 'resize' | 'ai';

export interface ImageEditorState {
	activeMode: EditMode | null;
	isProcessingAI: boolean;
	aiPrompt: string;
	aiFiles: File[];
	aiPreviewUrls: string[];
	isDragOver: boolean;
	selectedModelId: string;
	crop: PixelCrop | undefined;
}
