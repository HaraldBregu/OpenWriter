import type { DocumentState } from '../context/state';
import { useDocumentContext } from './use-document-context';

export function useDocumentState(): DocumentState {
	return useDocumentContext().state;
}
