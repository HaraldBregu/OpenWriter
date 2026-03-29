import { useContext, type Dispatch } from 'react';
import { DocumentDispatchContext } from '../providers';
import type { DocumentAction } from '../context/actions';

export function useDocumentDispatch(): Dispatch<DocumentAction> {
	const ctx = useContext(DocumentDispatchContext);
	if (ctx === null) {
		throw new Error('useDocumentDispatch must be used within a DocumentProvider');
	}
	return ctx;
}
