import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useMemo, useReducer, useRef } from 'react';
import { ImageContext } from './context/context';
import { imageReducer } from './context/reducer';
import { useImageActions } from './hooks/use-image-actions';
const ABSOLUTE_URL_RE = /^(https?:\/\/|data:|local-resource:\/\/)/;
function resolveImageSrc(src, documentBasePath) {
    if (!src)
        return null;
    if (ABSOLUTE_URL_RE.test(src))
        return src;
    if (!documentBasePath)
        return src;
    const normalized = documentBasePath.replace(/\\/g, '/');
    const urlPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
    return `local-resource://localhost${urlPath}/${src}`;
}
export function ImageProvider({ nodeViewProps, children }) {
    const { editor, node, getPos } = nodeViewProps;
    const { src, alt, title } = node.attrs;
    const storage = editor.storage;
    const documentBasePath = storage.image?.documentBasePath ?? null;
    const resolvedSrc = useMemo(() => resolveImageSrc(src, documentBasePath), [src, documentBasePath]);
    const [state, dispatch] = useReducer(imageReducer, undefined, () => ({
        loadError: false,
        hovered: false,
        focused: false,
        editing: false,
        editInitialMode: undefined,
        previewing: false,
    }));
    const prevSrcRef = useRef(resolvedSrc);
    useEffect(() => {
        if (prevSrcRef.current !== resolvedSrc) {
            prevSrcRef.current = resolvedSrc;
            dispatch({ type: 'RESET_LOAD_ERROR' });
        }
    }, [resolvedSrc]);
    const actions = useImageActions({ dispatch, editor, node, getPos });
    const showToolbar = (state.hovered || state.focused) && !state.loadError && !!resolvedSrc;
    const value = useMemo(() => ({
        state,
        resolvedSrc,
        alt,
        title,
        showToolbar,
        ...actions,
    }), [state, resolvedSrc, alt, title, showToolbar, actions]);
    return _jsx(ImageContext.Provider, { value: value, children: children });
}
