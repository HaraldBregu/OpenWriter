import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useRef, useState, } from 'react';
const ContentContext = createContext(undefined);
export function ContentProvider({ children }) {
    const [contents, setContents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const mountedRef = useRef(true);
    const refresh = useCallback(async () => {
        if (!mountedRef.current)
            return;
        setIsLoading(true);
        try {
            const items = await window.workspace.getContents();
            if (!mountedRef.current)
                return;
            setContents(items);
        }
        catch (err) {
            console.error('[ContentProvider] getContents failed:', err);
            if (!mountedRef.current)
                return;
            setContents([]);
        }
        finally {
            if (mountedRef.current)
                setIsLoading(false);
        }
    }, []);
    const removeContent = useCallback((id) => {
        setContents((prev) => prev.filter((entry) => entry.id !== id));
    }, []);
    useEffect(() => {
        mountedRef.current = true;
        void refresh();
        const unsubscribeWorkspace = window.workspace.onChange((event) => {
            if (event.currentPath) {
                void refresh();
                return;
            }
            setContents([]);
        });
        return () => {
            mountedRef.current = false;
            unsubscribeWorkspace();
        };
    }, [refresh]);
    return (_jsx(ContentContext.Provider, { value: { contents, isLoading, refresh, removeContent }, children: children }));
}
export function useContentContext() {
    const ctx = useContext(ContentContext);
    if (!ctx)
        throw new Error('useContentContext must be used within ContentProvider');
    return ctx;
}
