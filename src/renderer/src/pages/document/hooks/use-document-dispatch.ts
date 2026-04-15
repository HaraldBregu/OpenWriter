import type { Dispatch } from 'react';
import type { DocumentAction } from '../context/actions';
import { useDocumentContext } from './use-document-context';

export function useDocumentDispatch(): Dispatch<DocumentAction> {
	return useDocumentContext().dispatch;
}
