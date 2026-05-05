import { useCallback, useEffect, useReducer, type ReactElement, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { FilesContextValue } from './context/types';
import { initialFilesState } from './context/state';
import { filesReducer } from './context/reducer';
import { useSort } from './hooks/use-sort';
import { useFilter } from './hooks/use-filter';
import { useSelection } from './hooks/use-selection';
import { Context } from './Context';
import { useImagesContext } from '../../../contexts';

interface FilesProviderProps {
	readonly children: ReactNode;
}

export function Provider({ children }: FilesProviderProps): ReactElement {
	const location = useLocation();
	const { images, isLoading, removeImage } = useImagesContext();
	const [state, dispatch] = useReducer(filesReducer, initialFilesState);

	const { sortKey, sortDirection, handleSort } = useSort();
	const filteredEntries = useFilter({
		entries: images,
		searchQuery: state.searchQuery,
		typeFilter: state.typeFilter,
		sortKey,
		sortDirection,
	});
	const { selected, setSelected, allChecked, someChecked, handleToggleAll, handleToggleRow } =
		useSelection({ filteredEntries });

	const handleUpload = useCallback(async () => {
		dispatch({ type: 'SET_UPLOADING', payload: true });
		try {
			await window.workspace.insertResources([
				'.png',
				'.jpg',
				'.jpeg',
				'.gif',
				'.webp',
				'.svg',
			]);
		} catch {
			/* upload failed */
		} finally {
			dispatch({ type: 'SET_UPLOADING', payload: false });
		}
	}, []);

	const handleOpenFolder = useCallback(() => {
		void window.workspace.openResourcesFolder();
	}, []);

	const removeEntry = useCallback((id: string) => removeImage(id), [removeImage]);

	const setSearchQuery = useCallback(
		(query: string) => dispatch({ type: 'SET_SEARCH_QUERY', payload: query }),
		[]
	);

	const setViewMode = useCallback(
		(mode: FilesContextValue['viewMode']) => dispatch({ type: 'SET_VIEW_MODE', payload: mode }),
		[]
	);

	const setTypeFilter = useCallback(
		(filter: FilesContextValue['typeFilter']) =>
			dispatch({ type: 'SET_TYPE_FILTER', payload: filter }),
		[]
	);

	const setConfirmOpen = useCallback(
		(open: boolean) => dispatch({ type: 'SET_CONFIRM_OPEN', payload: open }),
		[]
	);

	const handleOpenFileDetails = useCallback(
		(file: FilesContextValue['activeFile'] & object) =>
			dispatch({ type: 'OPEN_FILE_DETAILS', payload: file }),
		[]
	);

	const handleFileDetailsOpenChange = useCallback((open: boolean) => {
		if (!open) dispatch({ type: 'CLOSE_FILE_DETAILS' });
	}, []);

	const toggleEditMode = useCallback(() => dispatch({ type: 'TOGGLE_EDIT_MODE' }), []);

	const handleDelete = useCallback(() => {
		if (selected.size === 0) return;
		dispatch({ type: 'SET_CONFIRM_OPEN', payload: true });
	}, [selected]);

	const handleDeleteOne = useCallback(
		(id: string) => {
			setSelected(new Set([id]));
			dispatch({ type: 'SET_CONFIRM_OPEN', payload: true });
		},
		[setSelected]
	);

	const handleDeleteMany = useCallback(
		(ids: string[]) => {
			if (ids.length === 0) return;
			setSelected(new Set(ids));
			dispatch({ type: 'SET_CONFIRM_OPEN', payload: true });
		},
		[setSelected]
	);

	const handleConfirmDelete = useCallback(async () => {
		const ids = [...selected];
		try {
			await Promise.all(ids.map((id) => window.workspace.deleteImage(id)));
			setSelected(new Set());
			dispatch({ type: 'DELETE_SUCCESS' });
		} catch {
			/* delete failed */
		}
	}, [selected, setSelected]);

	useEffect(() => {
		setSelected((current) => {
			const entryIds = new Set(images.map((entry) => entry.id));
			const nextSelected = new Set([...current].filter((id) => entryIds.has(id)));
			const hasChanged =
				nextSelected.size !== current.size || [...current].some((id) => !entryIds.has(id));
			return hasChanged ? nextSelected : current;
		});
	}, [images, setSelected]);

	useEffect(() => {
		if (state.activeFile && !images.some((entry) => entry.id === state.activeFile?.id)) {
			dispatch({ type: 'CLOSE_FILE_DETAILS' });
		}
	}, [state.activeFile, images]);

	useEffect(() => {
		const type = new URLSearchParams(location.search).get('type');
		const nextFilter =
			type === 'image' || type === 'video' || type === 'audio'
				? type
				: initialFilesState.typeFilter;
		dispatch({ type: 'SET_TYPE_FILTER', payload: nextFilter });
	}, [location.search]);

	const value: FilesContextValue = {
		entries: images,
		filteredEntries,
		isLoading,
		uploading: state.uploading,
		removeEntry,
		searchQuery: state.searchQuery,
		setSearchQuery,
		viewMode: state.viewMode,
		setViewMode,
		typeFilter: state.typeFilter,
		setTypeFilter,
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
		handleOpenFileDetails,
		handleFileDetailsOpenChange,
		handleUpload,
		handleOpenFolder,
		handleDelete,
		handleDeleteOne,
		handleDeleteMany,
		handleConfirmDelete,
		confirmOpen: state.confirmOpen,
		setConfirmOpen,
		editMode: state.editMode,
		toggleEditMode,
	};

	return <Context.Provider value={value}>{children}</Context.Provider>;
}
