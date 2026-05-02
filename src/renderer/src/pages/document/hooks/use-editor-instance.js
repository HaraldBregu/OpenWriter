import { useContext } from './use-context';
export function useEditorInstance() {
    const { editor, setEditor } = useContext();
    return { editor, setEditor };
}
