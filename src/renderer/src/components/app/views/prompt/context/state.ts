import type { ModelInfo } from 'src/shared/types';

type AgentId = 'text' | 'image';

export interface State {
	prompt: string;
	agentId: AgentId;
	files: File[];
	previewUrls: string[];
	isDragOver: boolean;
	selectedImageModel: ModelInfo;
	selectedTextModel: ModelInfo;
	selection: string;
}
