import { createContext } from 'react';
import type React from 'react';
import type { State } from './state';
import type { ModelInfo } from 'src/shared/types';

type AgentId = 'text' | 'image';

export interface ContextValue {
	state: State;
	loading: boolean;
	enable: boolean;
	agentId: AgentId;
	isImage: boolean;
	activeModel: ModelInfo;
	isSubmitDisabled: boolean;
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	submitRef: React.RefObject<(() => void) | null>;
	handlePromptChange: (value: string) => void;
	handleAgentChange: (agentId: AgentId) => void;
	setSelection: (value: string) => void;
	addFile: (file: File) => void;
	removeFile: (index: number) => void;
	handleFilesChange: (files: File[]) => void;
	handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	handleOpenFilePicker: () => void;
	handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
	handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
	handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
	submit: () => void;
	deleteNode: () => void;
	resizeTextarea: () => void;
	setStatusBarVisible: (visible: boolean) => void;
	setStatusBarMessage: (message: string) => void;
}

export const Context = createContext<ContextValue | null>(null);
