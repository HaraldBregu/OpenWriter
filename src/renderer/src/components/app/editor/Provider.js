import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo, useReducer } from 'react';
import { EditorContext } from './context/context';
import { editorReducer } from './context/reducer';
import { InsertImageDialog } from '../dialogs';
export function Provider({ editor, containerRef, onImageInsert, children, }) {
    const [state, dispatch] = useReducer(editorReducer, undefined, () => ({
        imageDialogOpen: false,
    }));
    const setImageDialogOpen = useCallback((open) => dispatch({ type: 'SET_IMAGE_DIALOG_OPEN', payload: open }), []);
    const value = useMemo(() => ({
        state,
        editor,
        containerRef,
        setImageDialogOpen,
    }), [state, editor, containerRef, setImageDialogOpen]);
    return (_jsxs(EditorContext.Provider, { value: value, children: [children, _jsx(InsertImageDialog, { open: state.imageDialogOpen, onOpenChange: setImageDialogOpen, onInsert: onImageInsert ?? (() => undefined) })] }));
}
