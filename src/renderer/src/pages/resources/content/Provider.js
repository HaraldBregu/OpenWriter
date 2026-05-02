import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useReducer } from 'react';
import { initialState } from './context/state';
import { contentReducer } from './context/reducer';
import { useSort } from './hooks/use-sort';
import { useFilter } from './hooks/use-filter';
import { useSelection } from './hooks/use-selection';
import { RESOURCE_SECTIONS } from '../shared/resource-sections';
const ContentContext = createContext(null);
export function useContentContext() {
    const context = useContext(ContentContext);
    if (!context) {
        throw new Error('useContentContext must be used within a ContentProvider');
    }
    return context;
}
export function ContentProvider({ children }) {
    const section = RESOURCE_SECTIONS.content;
    const [state, dispatch] = useReducer(contentReducer, initialState);
    const { sortKey, sortDirection, handleSort } = useSort();
    const filteredContents = useFilter({
        contents: state.contents,
        searchQuery: state.searchQuery,
        sortKey,
        sortDirection,
    });
    const { selected, setSelected, allChecked, someChecked, handleToggleAll, handleToggleRow } = useSelection({ filteredContents });
    const setContents = useCallback((contents) => {
        dispatch({ type: 'SET_CONTENTS', payload: contents });
    }, []);
    const setIsLoading = useCallback((loading) => {
        dispatch({ type: 'SET_IS_LOADING', payload: loading });
    }, []);
    const setSearchQuery = useCallback((query) => {
        dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
    }, []);
    const setConfirmOpen = useCallback((open) => {
        dispatch({ type: 'SET_CONFIRM_OPEN', payload: open });
    }, []);
    const refreshContents = useCallback(async () => {
        dispatch({ type: 'SET_IS_LOADING', payload: true });
        try {
            const next = await window.workspace.getContents();
            dispatch({ type: 'SET_CONTENTS', payload: next });
        }
        catch {
            dispatch({ type: 'SET_CONTENTS', payload: [] });
        }
        finally {
            dispatch({ type: 'SET_IS_LOADING', payload: false });
        }
    }, []);
    const handleUpload = useCallback(async (extensions) => {
        dispatch({ type: 'SET_UPLOADING', payload: true });
        try {
            const imported = await window.workspace.insertContents(extensions ?? section.uploadExtensions);
            if (imported.length > 0) {
                await refreshContents();
            }
        }
        catch {
            // Swallow picker-cancellation and validation errors
        }
        finally {
            dispatch({ type: 'SET_UPLOADING', payload: false });
        }
    }, [section, refreshContents]);
    const handleToggleEdit = useCallback(() => {
        if (state.editing) {
            setSelected(new Set());
        }
        dispatch({ type: 'SET_EDITING', payload: !state.editing });
    }, [state.editing, setSelected]);
    const handleOpenResourcesFolder = useCallback(() => {
        window.workspace.openContentsFolder();
    }, []);
    const handleDelete = useCallback(() => {
        if (selected.size === 0)
            return;
        dispatch({ type: 'SET_CONFIRM_OPEN', payload: true });
    }, [selected]);
    const handleDeleteOne = useCallback((id) => {
        setSelected(new Set([id]));
        dispatch({ type: 'SET_CONFIRM_OPEN', payload: true });
    }, [setSelected]);
    const handleDeleteMany = useCallback((ids) => {
        if (ids.length === 0)
            return;
        setSelected(new Set(ids));
        dispatch({ type: 'SET_CONFIRM_OPEN', payload: true });
    }, [setSelected]);
    const handleConfirmDelete = useCallback(async () => {
        dispatch({ type: 'SET_CONFIRM_OPEN', payload: false });
        const ids = [...selected];
        if (ids.length === 0)
            return;
        dispatch({ type: 'SET_REMOVING', payload: true });
        try {
            await Promise.all(ids.map((id) => window.workspace.deleteContent(id)));
            await refreshContents();
            setSelected(new Set());
        }
        finally {
            dispatch({ type: 'SET_REMOVING', payload: false });
        }
    }, [selected, refreshContents, setSelected]);
    const value = {
        contents: state.contents,
        setContents,
        filteredContents,
        isLoading: state.isLoading,
        setIsLoading,
        uploading: state.uploading,
        editing: state.editing,
        searchQuery: state.searchQuery,
        setSearchQuery,
        sortKey,
        sortDirection,
        handleSort,
        selected,
        allChecked,
        someChecked,
        handleToggleAll,
        handleToggleRow,
        handleUpload,
        handleToggleEdit,
        handleOpenResourcesFolder,
        handleDelete,
        handleDeleteOne,
        handleDeleteMany,
        handleConfirmDelete,
        refreshContents,
        confirmOpen: state.confirmOpen,
        setConfirmOpen,
        removing: state.removing,
    };
    return _jsx(ContentContext.Provider, { value: value, children: children });
}
