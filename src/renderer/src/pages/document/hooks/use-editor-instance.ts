import type { ContextValue } from '../context/context';
import { useContext } from './use-context';

export function useEditorInstance(): Pick<ContextValue, 'editor' | 'setEditor'> {
	const { editor, setEditor } = useContext();
	return { editor, setEditor };
}
