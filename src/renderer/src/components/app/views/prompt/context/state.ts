import type { ModelInfo } from 'src/shared/types';
import type { ContentGeneratorAgentId } from '../../../../editor/components/content-generator-agents';

export interface ContentGeneratorState {
	prompt: string;
	agentId: ContentGeneratorAgentId;
	files: File[];
	previewUrls: string[];
	isDragOver: boolean;
	selectedImageModel: ModelInfo;
	selectedTextModel: ModelInfo;
}
