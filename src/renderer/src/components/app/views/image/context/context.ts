import { createContext } from 'react';
import type React from 'react';
import type { PixelCrop } from 'react-image-crop';
import type { ImageEditorState, EditMode } from './state';
import type { UseImageCanvasReturn } from '../../../../editor/hooks/use-image-canvas';

export interface ImageEditorRefs {
	editorRef: React.RefObject<HTMLDivElement | null>;
	aiTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
	aiFileInputRef: React.RefObject<HTMLInputElement | null>;
}

export interface ImageEditorContextValue {
	src: string;
	alt: string | null;
	state: ImageEditorState;
	canvas: UseImageCanvasReturn;
	refs: ImageEditorRefs;
	hasCropSelection: boolean;
	cropDimensionLabel: string;
	handleModeChange: (mode: EditMode) => void;
	handleCropChange: (pixelCrop: PixelCrop) => void;
	handleApplyCrop: () => void;
	handleResetCrop: () => void;
	handleSave: () => void;
	handleCancel: () => void;
	handleAISubmit: () => void;
	handleAIButtonClick: () => void;
	handleCancelAI: () => void;
	handlePromptKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
	handleEditorKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
	handleAIFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	handleAIDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
	handleAIDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
	handleAIDrop: (e: React.DragEvent<HTMLDivElement>) => void;
	setAIPrompt: (value: string) => void;
	setSelectedModelId: (id: string) => void;
	removeAIFile: (index: number) => void;
	openFilePicker: () => void;
}

export const ImageEditorContext = createContext<ImageEditorContextValue | null>(null);
