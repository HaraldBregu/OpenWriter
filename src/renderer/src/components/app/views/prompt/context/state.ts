import type { ModelInfo } from 'src/shared/types';

type ContentGeneratorAgentId = 'text' | 'image';

export interface ContentGeneratorState {
	prompt: string;
	agentId: ContentGeneratorAgentId;
	files: File[];
	previewUrls: string[];
	isDragOver: boolean;
	selectedImageModel: ModelInfo;
	selectedTextModel: ModelInfo;
	selection: string;
}
