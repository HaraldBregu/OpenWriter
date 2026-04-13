import { createContext } from 'react';
import type React from 'react';
import type { ContentGeneratorState } from './state';
import type { ContentGeneratorAgentId } from '../agents';
import type { ModelInfo } from '../../../../../../../shared/types';

export interface ContentGeneratorContextValue {
	state: ContentGeneratorState;
	loading: boolean;
	enable: boolean;
	agentId: ContentGeneratorAgentId;
	isImage: boolean;
	activeModel: ModelInfo;
	isSubmitDisabled: boolean;
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	submitRef: React.RefObject<(() => void) | null>;
	handlePromptChange: (value: string) => void;
	handleAgentChange: (agentId: ContentGeneratorAgentId) => void;
	handleImageModelChange: (model: ModelInfo) => void;
	handleTextModelChange: (model: ModelInfo) => void;
	addFile: (file: File) => void;
	removeFile: (index: number) => void;
	handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	handleOpenFilePicker: () => void;
	handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
	handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
	handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
	submit: () => void;
	deleteNode: () => void;
	resizeTextarea: () => void;
}

export const ContentGeneratorContext = createContext<ContentGeneratorContextValue | null>(null);
