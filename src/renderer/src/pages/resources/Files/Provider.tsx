import { useCallback, useEffect, useReducer, useRef, type ReactElement, type ReactNode } from 'react';
import type { FilesContextValue } from './context/types';
import { initialFilesState } from './context/state';
import { filesReducer } from './context/reducer';
import { useSort } from './hooks/use-sort';
import { useFilter } from './hooks/use-filter';
import { useSelection } from './hooks/use-selection';
import { RESOURCE_SECTIONS } from '../shared/resource-sections';
import { Context } from './Context';

interface FilesProviderProps {
	readonly children: ReactNode;
}

export function FilesProvider({ children }: FilesProviderProps): ReactElement {
	const mountedRef = useRef(true);
	const [state, dispatch] = useReducer(filesReducer, initialFilesState);

	const { sortKey, sortDirection, handleSort } = useSort();
	const filteredEntries = useFilter({
		entries: state.entries,
		searchQuery: state.searchQuery,
		typeFilter: state.typeFilter,
		sortKey,
		sortDirection,
	});
	const { selected, setSelected, allChecked, someChecked, handleToggleAll, handleToggleRow } =
		useSelection({ filteredEntries });

	const refreshFiles = useCallback(async () => {
		if (!mountedRef.current) return;
		dispatch({ type: 'SET_IS_LOADING', payload: true });
		try {
			const files = await window.workspace.getResourcesFiles();
			if (!mountedRef.current) return;
			dispatch({ type: 'SET_ENTRIES', payload: files });
		} catch {
			if (!mountedRef.current) return;
			dispatch({ type: 'SET_ENTRIES', payload: [] });
		} finally {
			if (mountedRef.current) {
				dispatch({ type: 'SET_IS_LOADING', payload: false });
			}
		}
	}, []);

	const handleUpload = useCallback(async () => {
		dispatch({ type: 'SET_UPLOADING', payload: true });
		try {
			const imported = await window.workspace.insertResourcesFiles(
				RESOURCE_SECTIONS.files.uploadExtensions,
			);
			if (imported.length > 0) {
				await refreshFiles();
			}
		} catch {
			/* upload failed */
		} finally {
			if (mountedRef.current) {
				dispatch({ type: 'SET_UPLOADING', payload: false });
			}
		}
	}, [refreshFiles]);

	const handleOpenFolder = useCallback(() => {
		void window.workspace.openFilesFolder();
	}, []);

	const handleDelete = useCallback(() => {
		if (selected.size === 0) return;
		dispatch({ type: 'SET_CONFIRM_OPEN', payload: true });
	}, [selected]);

	const handleConfirmDelete = useCallback(async () => {
		try {
			await Promise.all(
				[...selected].map((id) => window.workspace.deleteResourcesFileEntry(id)),
			);
			setSelected(new Set());
			dispatch({ type: 'DELETE_SUCCESS' });
			await refreshFiles();
		} catch {
			/* delete failed */
		}
	}, [refreshFiles, selected, setSelected]);

	useEffect(() => {
		const unsubscribeFiles = window.workspace.onResourcesFilesChanged(() => {
			void refreshFiles();
		});
		const unsubscribeWorkspace = window.workspace.onChange((event) => {
			if (event.currentPath) {
				void refreshFiles();
				return;
			}
			dispatch({ type: 'RESET_ENTRIES' });
			setSelected(new Set());
		});
		return () => {
			mountedRef.current = false;
			unsubscribeFiles();
			unsubscribeWorkspace();
		};
	}, [refreshFiles, setSelected]);

	useEffect(() => {
		setSelected((current) => {
			const entryIds = new Set(state.entries.map((entry) => entry.id));
			const nextSelected = new Set([...current].filter((id) => entryIds.has(id)));
			const hasChanged =
				nextSelected.size !== current.size || [...current].some((id) => !entryIds.has(id));
			return hasChanged ? nextSelected : current;
		});
	}, [state.entries, setSelected]);

	useEffect(() => {
		if (state.activeFile && !state.entries.some((entry) => entry.id === state.activeFile?.id)) {
			dispatch({ type: 'CLOSE_FILE_DETAILS' });
		}
	}, [state.activeFile, state.entries]);

	const value: FilesContextValue = {
		entries: state.entries,
		filteredEntries,
		isLoading: state.isLoading,
		uploading: state.uploading,
		setEntries: (entries) => dispatch({ type: 'SET_ENTRIES', payload: entries }),
		setIsLoading: (loading) => dispatch({ type: 'SET_IS_LOADING', payload: loading }),
		searchQuery: state.searchQuery,
		setSearchQuery: (query) => dispatch({ type: 'SET_SEARCH_QUERY', payload: query }),
		viewMode: state.viewMode,
		setViewMode: (mode) => dispatch({ type: 'SET_VIEW_MODE', payload: mode }),
		typeFilter: state.typeFilter,
		setTypeFilter: (filter) => dispatch({ type: 'SET_TYPE_FILTER', payload: filter }),
		sortKey,
		sortDirection,
		handleSort,
		selected,
		allChecked,
		someChecked,
		handleToggleAll,
		handleToggleRow,
		activeFile: state.activeFile,
		fileDetailsOpen: state.fileDetailsOpen,
		handleOpenFileDetails: (file) => dispatch({ type: 'OPEN_FILE_DETAILS', payload: file }),
		handleFileDetailsOpenChange: (open) => {
			if (!open) dispatch({ type: 'CLOSE_FILE_DETAILS' });
		},
		handleUpload,
		handleOpenFolder,
		handleDelete,
		handleConfirmDelete,
		confirmOpen: state.confirmOpen,
		setConfirmOpen: (open) => dispatch({ type: 'SET_CONFIRM_OPEN', payload: open }),
		editMode: state.editMode,
		toggleEditMode: () => dispatch({ type: 'TOGGLE_EDIT_MODE' }),
	};

	return <Context.Provider value={value}>{children}</Context.Provider>;
}
