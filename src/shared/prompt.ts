import { ModelInfo } from "./types";

export type PromptSubmitPayload =
    | { type: 'text'; prompt: string }
    | { type: 'image'; prompt: string; files: File[] };

export interface PromptOptions {
    defaultTextModel?: ModelInfo;
    defaultImageModel?: ModelInfo;
    onTextModelChange?: (model: ModelInfo) => void;
    onImageModelChange?: (model: ModelInfo) => void;
    onPromptSubmit: (payload: PromptSubmitPayload) => void;
}

export interface ContentGeneratorStorage {
	defaultTextModel: ModelInfo | undefined;
	defaultImageModel: ModelInfo | undefined;
}
