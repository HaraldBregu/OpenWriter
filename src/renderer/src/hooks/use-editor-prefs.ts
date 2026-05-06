import { useEditorPrefsContext } from '../contexts/EditorPrefsProvider';
import type { EditorPrefsContextValue } from '../contexts/EditorPrefsProvider';

export function useEditorPrefs(): EditorPrefsContextValue {
	return useEditorPrefsContext();
}
