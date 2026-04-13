import type { Dispatch } from 'react';
import type { DocumentAction } from '../context/actions';
import { useContext } from '../Provider';

export function useDocumentDispatch(): Dispatch<DocumentAction> {
	return useContext().dispatch;
}
