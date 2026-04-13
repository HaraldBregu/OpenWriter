import type { ModelInfo } from '../../../../../../../shared/types';

export interface ContentGeneratorState {
	prompt: string;
	files: File[];
	previewUrls: string[];
	isDragOver: boolean;
	selectedImageModel: ModelInfo;
	selectedTextModel: ModelInfo;
}
