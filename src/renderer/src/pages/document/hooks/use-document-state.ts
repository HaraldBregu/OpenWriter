import type { DocumentState } from '../context/state';
import { useContext } from '../Provider';

export function useDocumentState(): DocumentState {
	return useContext().state;
}
