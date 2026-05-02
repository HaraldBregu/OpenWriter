import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useRef, useState, } from 'react';
const ImagesContext = createContext(undefined);
export function ImagesProvider({ children }) {
    const [images, setImages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const mountedRef = useRef(true);
    const refresh = useCallback(async () => {
        if (!mountedRef.current)
            return;
        setIsLoading(true);
        try {
            const items = await window.workspace.getImages();
            if (!mountedRef.current)
                return;
            setImages(items);
        }
        catch (err) {
            console.error('[ImagesProvider] getImages failed:', err);
            if (!mountedRef.current)
                return;
            setImages([]);
        }
        finally {
            if (mountedRef.current)
                setIsLoading(false);
        }
    }, []);
    const removeImage = useCallback((id) => {
        setImages((prev) => prev.filter((entry) => entry.id !== id));
    }, []);
    useEffect(() => {
        mountedRef.current = true;
        void refresh();
        const unsubscribeImages = window.workspace.onImagesChanged(() => {
            void refresh();
        });
        const unsubscribeWorkspace = window.workspace.onChange((event) => {
            if (event.currentPath) {
                void refresh();
                return;
            }
            setImages([]);
        });
        return () => {
            mountedRef.current = false;
            unsubscribeImages();
            unsubscribeWorkspace();
        };
    }, [refresh]);
    return (_jsx(ImagesContext.Provider, { value: { images, isLoading, refresh, removeImage }, children: children }));
}
export function useImagesContext() {
    const ctx = useContext(ImagesContext);
    if (!ctx)
        throw new Error('useImagesContext must be used within ImagesProvider');
    return ctx;
}
