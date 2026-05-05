import { createContext, useCallback, useContext, useReducer } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { ResourceInfo } from '../../../../shared/types';
import type { SortDirection, SortKey } from './shared/types';
import { initialState } from './context/state';
import { resourcesReducer } from './context/reducer';
import { useSort } from './hooks/use-sort';
import { useFilter } from './hooks/use-filter';
import { useSelection } from './hooks/use-selection';

export interface ResourcesContextValue {
	resources: ResourceInfo[];
	setResources: (resources: ResourceInfo[]) => void;
	filteredResources: ResourceInfo[];
	isLoading: boolean;
	setIsLoading: (loading: boolean) => void;
	uploading: boolean;
	editing: boolean;
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	sortKey: SortKey;
	sortDirection: SortDirection;
	handleSort: (key: SortKey) => void;
	selected: Set<string>;
	allChecked: boolean;
	someChecked: boolean;
	handleToggleAll: () => void;
	handleToggleRow: (id: string) => void;
	handleUpload: (extensions?: string[]) => void;
	handleToggleEdit: () => void;
	handleOpenResourcesFolder: () => void;
	handleDelete: () => void;
	handleDeleteOne: (id: string) => void;
	handleDeleteMany: (ids: string[]) => void;
	refreshResources: () => Promise<void>;
	handleConfirmDelete: () => Promise<void>;
	confirmOpen: boolean;
	setConfirmOpen: (open: boolean) => void;
	removing: boolean;
}

const ResourcesContext = createContext<ResourcesContextValue | null>(null);

export function useResourcesContext(): ResourcesContextValue {
	const context = useContext(ResourcesContext);
	if (!context) {
		throw new Error('useResourcesContext must be used within a ResourcesProvider');
	}
	return context;
}

interface ResourcesProviderProps {
	readonly children: ReactNode;
}

export function ResourcesProvider({ children }: ResourcesProviderProps): ReactElement {
	const [state, dispatch] = useReducer(resourcesReducer, initialState);

	const { sortKey, sortDirection, handleSort } = useSort();
	const filteredResources = useFilter({
		resources: state.resources,
		searchQuery: state.searchQuery,
		sortKey,
		sortDirection,
	});
	const { selected, setSelected, allChecked, someChecked, handleToggleAll, handleToggleRow } =
		useSelection({ filteredResources });

	const setResources = useCallback((resources: ResourceInfo[]) => {
		dispatch({ type: 'SET_RESOURCES', payload: resources });
	}, []);

	const setIsLoading = useCallback((loading: boolean) => {
		dispatch({ type: 'SET_IS_LOADING', payload: loading });
	}, []);

	const setSearchQuery = useCallback((query: string) => {
		dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
	}, []);

	const setConfirmOpen = useCallback((open: boolean) => {
		dispatch({ type: 'SET_CONFIRM_OPEN', payload: open });
	}, []);

	const refreshResources = useCallback(async () => {
		dispatch({ type: 'SET_IS_LOADING', payload: true });
		try {
			const next = await window.workspace.getResources();
			dispatch({ type: 'SET_RESOURCES', payload: next });
		} catch {
			dispatch({ type: 'SET_RESOURCES', payload: [] });
		} finally {
			dispatch({ type: 'SET_IS_LOADING', payload: false });
		}
	}, []);

	const handleUpload = useCallback(
		async (extensions?: string[]) => {
			dispatch({ type: 'SET_UPLOADING', payload: true });
			try {
				const imported = await window.workspace.insertResources(extensions);
				if (imported.length > 0) {
					await refreshResources();
				}
			} catch {
				// Swallow picker-cancellation and validation errors
			} finally {
				dispatch({ type: 'SET_UPLOADING', payload: false });
			}
		},
		[refreshResources]
	);

	const handleToggleEdit = useCallback(() => {
		if (state.editing) {
			setSelected(new Set());
		}
		dispatch({ type: 'SET_EDITING', payload: !state.editing });
	}, [state.editing, setSelected]);

	const handleOpenResourcesFolder = useCallback(() => {
		window.workspace.openResourcesFolder();
	}, []);

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
		dispatch({ type: 'SET_CONFIRM_OPEN', payload: false });
		const ids = [...selected];
		if (ids.length === 0) return;

		dispatch({ type: 'SET_REMOVING', payload: true });
		try {
			await Promise.all(ids.map((id) => window.workspace.deleteResource(id)));
			await refreshResources();
			setSelected(new Set());
		} finally {
			dispatch({ type: 'SET_REMOVING', payload: false });
		}
	}, [selected, refreshResources, setSelected]);

	const value: ResourcesContextValue = {
		resources: state.resources,
		setResources,
		filteredResources,
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
		refreshResources,
		confirmOpen: state.confirmOpen,
		setConfirmOpen,
		removing: state.removing,
	};

	return <ResourcesContext.Provider value={value}>{children}</ResourcesContext.Provider>;
}
