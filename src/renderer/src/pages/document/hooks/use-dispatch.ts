import type { Dispatch } from 'react';
import type { DocumentAction } from '../context/actions';
import { useContext } from './use-context';

export function useDispatch(): Dispatch<DocumentAction> {
	return useContext().dispatch;
}
