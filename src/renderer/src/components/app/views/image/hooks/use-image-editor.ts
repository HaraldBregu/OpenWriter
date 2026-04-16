import { useContext } from 'react';
import { ImageEditorContext } from '../context/context';
import type { ImageEditorContextValue } from '../context/context';

export function useImageEditor(): ImageEditorContextValue {
	const context = useContext(ImageEditorContext);
	if (!context) {
		throw new Error('useImageEditor must be used within ImageEditorProvider');
	}
	return context;
}
