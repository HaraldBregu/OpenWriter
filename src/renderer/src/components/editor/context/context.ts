import { createContext } from 'react';
import type React from 'react';
import type { Editor } from '@tiptap/core';
import type { EditorState, HoveredBlock, ContentGeneratorState } from './state';
import type { ContentGeneratorAgentId } from '../components/content_generator/agents';
import type { ModelInfo } from '../../../../../shared/types';

export interface EditorContextValue {
	state: EditorState;
	editor: Editor;
	containerRef: React.RefObject<HTMLDivElement | null>;
	setHoveredBlock: (block: HoveredBlock | null) => void;
	setImageDialogOpen: (open: boolean) => void;
	onContinueWithAssistant?: (
		before: string,
		after: string,
		cursorPos: number,
		closeMenu: () => void
	) => void;
	onInsertContent?: () => void;
}

export const EditorContext = createContext<EditorContextValue | null>(null);

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
	handleFilesChange: (files: File[]) => void;
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
