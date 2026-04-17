import { useContext } from 'react';
import { EditorContext, type EditorContextValue } from '../context/context';

export function useEditor(): EditorContextValue {
	const ctx = useContext(EditorContext);
	if (!ctx) {
		throw new Error('useEditor must be used within an EditorProvider');
	}
	return ctx;
}
