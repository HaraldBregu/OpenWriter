import { useEditorWidthContext } from '../contexts/EditorWidthProvider';
import type { EditorWidthContextValue } from '../contexts/EditorWidthProvider';

export function useEditorWidth(): EditorWidthContextValue {
	return useEditorWidthContext();
}
