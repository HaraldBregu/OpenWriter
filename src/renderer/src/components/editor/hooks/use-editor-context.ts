import { useContext } from 'react';
import { Context, type ContextValue } from '../Provider';

export function useEditorContext(): ContextValue {
	const ctx = useContext(Context);
	if (!ctx) {
		throw new Error('useEditorContext must be used within an EditorProvider');
	}
	return ctx;
}
