import { ModelInfo } from "./types";

export interface PromptOptions {
    defaultTextModel?: ModelInfo;
    defaultImageModel?: ModelInfo;
    onTextModelChange?: (model: ModelInfo) => void;
    onImageModelChange?: (model: ModelInfo) => void;
    onGenerateTextSubmit: (prompt: string) => void;
    onGenerateImageSubmit: (prompt: string, files: File[]) => void;
}

export interface ContentGeneratorStorage {
	defaultTextModel: ModelInfo | undefined;
	defaultImageModel: ModelInfo | undefined;
}
