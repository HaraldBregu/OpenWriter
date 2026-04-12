import type { ReactElement, ReactNode } from 'react';
import { FilesContext } from './context/FilesContext';
import type { FilesContextValue } from './context/types';
import { useFilesState } from './hooks/use-files-state';
import { useFilesActions } from './hooks/use-files-actions';
import { useFilesEffects } from './hooks/use-files-effects';

interface FilesProviderProps {
	readonly children: ReactNode;
}

export function FilesProvider({ children }: FilesProviderProps): ReactElement {
	const state = useFilesState();
	const actions = useFilesActions(state);

	useFilesEffects({ state, actions });

	const value: FilesContextValue = {
		entries: state.entries,
		filteredEntries: state.filteredEntries,
		isLoading: state.isLoading,
		uploading: state.uploading,
		setEntries: state.setEntries,
		setIsLoading: state.setIsLoading,
		searchQuery: state.searchQuery,
		setSearchQuery: state.setSearchQuery,
		viewMode: state.viewMode,
		setViewMode: state.setViewMode,
		typeFilter: state.typeFilter,
		setTypeFilter: state.setTypeFilter,
		sortKey: state.sortKey,
		sortDirection: state.sortDirection,
		handleSort: state.handleSort,
		selected: state.selected,
		allChecked: state.allChecked,
		someChecked: state.someChecked,
		handleToggleAll: state.handleToggleAll,
		handleToggleRow: state.handleToggleRow,
		activeFile: state.activeFile,
		fileDetailsOpen: state.fileDetailsOpen,
		handleOpenFileDetails: actions.handleOpenFileDetails,
		handleFileDetailsOpenChange: actions.handleFileDetailsOpenChange,
		handleUpload: actions.handleUpload,
		handleOpenFolder: actions.handleOpenFolder,
		handleDelete: actions.handleDelete,
		handleConfirmDelete: actions.handleConfirmDelete,
		confirmOpen: state.confirmOpen,
		setConfirmOpen: state.setConfirmOpen,
		editMode: state.editMode,
		toggleEditMode: actions.toggleEditMode,
	};

	return <FilesContext.Provider value={value}>{children}</FilesContext.Provider>;
}
