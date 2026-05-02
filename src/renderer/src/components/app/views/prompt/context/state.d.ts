import type { ModelInfo } from 'src/shared/types';
export interface State {
    prompt: string;
    files: File[];
    previewUrls: string[];
    isDragOver: boolean;
    selectedImageModel: ModelInfo;
    selectedTextModel: ModelInfo;
    selection: string;
}
