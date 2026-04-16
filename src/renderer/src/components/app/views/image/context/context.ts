import { createContext } from 'react';
import type React from 'react';
import type { ImageState } from './state';

export interface ImageContextValue {
	state: ImageState;
	resolvedSrc: string | null;
	alt: string | null;
	title: string | null;
	showToolbar: boolean;
	handleError: () => void;
	handleLoad: () => void;
	handleDelete: () => void;
	handleAskAI: () => void;
	handleEdit: () => void;
	handleImageClick: () => void;
	handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
	handleEditorSave: (dataUri: string) => Promise<void>;
	handleEditorCancel: () => void;
	setHovered: (value: boolean) => void;
	setFocused: (value: boolean) => void;
	setPreviewing: (value: boolean) => void;
}

export const ImageContext = createContext<ImageContextValue | null>(null);
