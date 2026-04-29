import type { DocumentState } from '../context/state';
import { useContext } from './use-context';

export function useState(): DocumentState {
	return useContext().state;
}
