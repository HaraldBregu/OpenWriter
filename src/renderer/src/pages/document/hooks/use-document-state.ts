import { useContext } from 'react';
import { DocumentStateContext } from '../providers';
import type { DocumentState } from '../context/state';

export function useDocumentState(): DocumentState {
	const ctx = useContext(DocumentStateContext);
	if (ctx === null) {
		throw new Error('useDocumentState must be used within a DocumentProvider');
	}
	return ctx;
}
