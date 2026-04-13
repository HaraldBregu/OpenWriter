import type { ModelInfo } from '../../../../../../../shared/types';
import type { ContentGeneratorAgentId } from '../agents';

export interface ContentGeneratorState {
	prompt: string;
	agentId: ContentGeneratorAgentId;
	files: File[];
	previewUrls: string[];
	isDragOver: boolean;
	selectedImageModel: ModelInfo;
	selectedTextModel: ModelInfo;
}
