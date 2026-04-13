import type { Dispatch } from 'react';
import { useContext } from '../providers';
import type { DocumentAction } from '../context/actions';

export function useDocumentDispatch(): Dispatch<DocumentAction> {
	return useContext().dispatch;
}
