import { useContext } from '../providers';
import type { DocumentState } from '../context/state';

export function useDocumentState(): DocumentState {
	return useContext().state;
}
