import type { AssistantState } from '../context/state';
import { useContext } from './use-context';

export function useState(): AssistantState {
	return useContext().state;
}
