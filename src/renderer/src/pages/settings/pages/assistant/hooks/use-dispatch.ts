import type { Dispatch } from 'react';
import type { AssistantAction } from '../context/actions';
import { useContext } from './use-context';

export function useDispatch(): Dispatch<AssistantAction> {
	return useContext().dispatch;
}
