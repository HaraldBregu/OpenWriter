import { useDocumentContext } from '../providers';
import type { DocumentState } from '../context/state';

export function useDocumentState(): DocumentState {
	return useDocumentContext().state;
}
