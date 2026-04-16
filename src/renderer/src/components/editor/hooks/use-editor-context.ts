import { useContext } from 'react';
import { EditorContext, type EditorContextValue } from '../context/context';

export function useEditorContext(): EditorContextValue {
	const ctx = useContext(EditorContext);
	if (!ctx) {
		throw new Error('useEditorContext must be used within an EditorProvider');
	}
	return ctx;
}
