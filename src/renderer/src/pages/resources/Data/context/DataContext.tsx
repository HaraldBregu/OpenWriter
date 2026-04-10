import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { ResourceInfo } from '../../../../../../shared/types';
import type { SortDirection, SortKey } from '../types';
import { useAppDispatch, useAppSelector } from '@/store';
import {
	importResourcesRequested,
	loadIndexingInfo,
	removeResources,
	selectCurrentWorkspacePath,
	selectImporting,
	selectIndexingInfo,
	selectResources,
	selectResourcesError,
	selectResourcesStatus,
} from '@/store/workspace';
import { useTaskListener } from '@/hooks/use-task-listener';
import { filterResourcesBySection, RESOURCE_SECTIONS } from '../../shared/resource-sections';
import { useDataSort } from '../hooks/use-data-sort';
import { useDataFilter } from '../hooks/use-data-filter';
import { useDataSelection } from '../hooks/use-data-selection';

const SECTION_ID = 'data' as const;
const RESOURCES_DIR = 'resources';

interface DataContextValue {
	resources: ResourceInfo[];
	filteredResources: ResourceInfo[];
	mimeTypes: string[];
	isLoading: boolean;
	error: string | null;
	uploading: boolean;
	editing: boolean;
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	typeFilter: string;
	setTypeFilter: (filter: string) => void;
	sortKey: SortKey;
	sortDirection: SortDirection;
	handleSort: (key: SortKey) => void;
	selected: Set<string>;
	allChecked: boolean;
	someChecked: boolean;
	handleToggleAll: () => void;
	handleToggleRow: (id: string) => void;
	handleUpload: () => void;
	handleToggleEdit: () => void;
	handleOpenResourcesFolder: () => void;
	handleOpenDataFolder: () => void;
	handleDelete: () => void;
	handleConfirmDelete: () => Promise<void>;
	handleIndex: () => void;
	confirmOpen: boolean;
	setConfirmOpen: (open: boolean) => void;
	removing: boolean;
	indexing: boolean;
	indexingInfo: ReturnType<typeof selectIndexingInfo>;
	previewResource: ResourceInfo | null;
	setPreviewResource: (resource: ResourceInfo | null) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useDataContext(): DataContextValue {
	const context = useContext(DataContext);
	if (!context) {
		throw new Error('useDataContext must be used within a DataProvider');
	}
	return context;
}

interface DataProviderProps {
	readonly children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps): ReactElement {
	const dispatch = useAppDispatch();
	const section = RESOURCE_SECTIONS[SECTION_ID];
	const allResources = useAppSelector(selectResources);
	const status = useAppSelector(selectResourcesStatus);
	const error = useAppSelector(selectResourcesError);
	const uploading = useAppSelector(selectImporting);
	const workspacePath = useAppSelector(selectCurrentWorkspacePath);
	const indexingInfo = useAppSelector(selectIndexingInfo);

	const resources = useMemo(
		() => filterResourcesBySection(allResources, SECTION_ID),
		[allResources]
	);

	const indexingTask = useTaskListener<{
		indexedCount: number;
		failedIds: string[];
		totalChunks: number;
	}>('index-resources');

	const isLoading = status === 'idle' || status === 'loading';
	const indexing = indexingTask.isRunning || indexingTask.isQueued;

	const [searchQuery, setSearchQuery] = useState('');
	const [typeFilter, setTypeFilter] = useState('all');
	const [editing, setEditing] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [removing, setRemoving] = useState(false);
	const [previewResource, setPreviewResource] = useState<ResourceInfo | null>(null);

	const { sortKey, sortDirection, handleSort } = useDataSort();
	const filteredResources = useDataFilter({
		resources,
		searchQuery,
		typeFilter,
		sortKey,
		sortDirection,
	});
	const { selected, setSelected, allChecked, someChecked, handleToggleAll, handleToggleRow } =
		useDataSelection({ filteredResources });

	const mimeTypes = useMemo(() => {
		const types = new Set(resources.map((r) => r.mimeType));
		return Array.from(types).sort();
	}, [resources]);

	useEffect(() => {
		dispatch(loadIndexingInfo());
	}, [dispatch]);

	useEffect(() => {
		if (indexingTask.isCompleted) {
			dispatch(loadIndexingInfo());
		}
	}, [dispatch, indexingTask.isCompleted]);

	useEffect(() => {
		setSelected((current) => {
			const resourceIds = new Set(resources.map((r) => r.id));
			const nextSelected = new Set([...current].filter((id) => resourceIds.has(id)));
			const hasChanged =
				nextSelected.size !== current.size || [...current].some((id) => !resourceIds.has(id));
			return hasChanged ? nextSelected : current;
		});
	}, [resources, setSelected]);

	const handleIndex = useCallback(() => {
		if (!workspacePath || indexing) return;
		window.task.submit('index-resources', {
			workspacePath,
			resourcesPath: `${workspacePath}/${RESOURCES_DIR}`,
		});
	}, [indexing, workspacePath]);

	const handleUpload = useCallback(() => {
		dispatch(importResourcesRequested(section.uploadExtensions));
	}, [dispatch, section.uploadExtensions]);

	const handleToggleEdit = useCallback(() => {
		setEditing((current) => {
			if (current) {
				setSelected(new Set());
			}
			return !current;
		});
	}, [setSelected]);

	const handleOpenResourcesFolder = useCallback(() => {
		window.workspace.openResourcesFolder();
	}, []);

	const handleOpenDataFolder = useCallback(() => {
		window.workspace.openDataFolder();
	}, []);

	const handleDelete = useCallback(() => {
		if (selected.size === 0) return;
		setConfirmOpen(true);
	}, [selected]);

	const handleConfirmDelete = useCallback(async () => {
		setConfirmOpen(false);
		const ids = [...selected];
		if (ids.length === 0) return;

		setRemoving(true);
		try {
			await dispatch(removeResources(ids)).unwrap();
			setSelected(new Set());
		} finally {
			setRemoving(false);
		}
	}, [dispatch, selected, setSelected]);

	const value: DataContextValue = {
		resources,
		filteredResources,
		mimeTypes,
		isLoading,
		error,
		uploading,
		editing,
		searchQuery,
		setSearchQuery,
		typeFilter,
		setTypeFilter,
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
		handleOpenDataFolder,
		handleDelete,
		handleConfirmDelete,
		handleIndex,
		confirmOpen,
		setConfirmOpen,
		removing,
		indexing,
		indexingInfo,
		previewResource,
		setPreviewResource,
	};

	return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
