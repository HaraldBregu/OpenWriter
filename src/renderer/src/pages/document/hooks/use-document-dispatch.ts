import type { Dispatch } from 'react';
import { useDocumentContext } from '../providers';
import type { DocumentAction } from '../context/actions';

export function useDocumentDispatch(): Dispatch<DocumentAction> {
	return useDocumentContext().dispatch;
}
