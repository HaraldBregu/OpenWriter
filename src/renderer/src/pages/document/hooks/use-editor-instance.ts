import type { ContextValue } from '../context/context';
import { useDocumentContext } from './use-document-context';

export function useEditorInstance(): Pick<ContextValue, 'editor' | 'setEditor'> {
	const { editor, setEditor } = useDocumentContext();
	return { editor, setEditor };
}
