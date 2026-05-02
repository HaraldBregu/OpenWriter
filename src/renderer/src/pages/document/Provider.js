import { jsx as _jsx } from "react/jsx-runtime";
import { useReducer, useMemo, useState, useCallback } from 'react';
import { documentReducer } from './context/reducer';
import { INITIAL_DOCUMENT_STATE } from './context/state';
import { DocumentContext } from './context/context';
export function Provider({ children, documentId }) {
    const [state, dispatch] = useReducer(documentReducer, {
        ...INITIAL_DOCUMENT_STATE,
        documentId,
    });
    const [editor, setEditorState] = useState(null);
    const setEditor = useCallback((ed) => {
        setEditorState(ed);
    }, []);
    const value = useMemo(() => ({
        state,
        dispatch,
        editor,
        setEditor,
    }), [state, dispatch, editor, setEditor]);
    return _jsx(DocumentContext.Provider, { value: value, children: children });
}
