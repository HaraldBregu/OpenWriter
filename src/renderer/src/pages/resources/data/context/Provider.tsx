import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	type ReactElement,
	type ReactNode,
} from 'react';
import type { DataContextValue } from './types';
import type { KnowledgeBase } from '../types';
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
import type { TaskEvent, TaskState } from '../../../../../../shared/types';
import { filterResourcesBySection, RESOURCE_SECTIONS } from '../../shared/resource-sections';
import { useDataSort } from '../hooks/use-data-sort';
import { useDataFilter } from '../hooks/use-data-filter';
import { useDataSelection } from '../hooks/use-data-selection';
import { Context } from './Context';

const SECTION_ID = 'data' as const;

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

	const [indexingTaskId, setIndexingTaskId] = useState<string | null>(null);
	const [indexingStatus, setIndexingStatus] = useState<TaskState | null>(null);
	const indexingTaskCompleted = indexingStatus === 'completed';
	const indexingTaskActive =
		indexingStatus === 'queued' || indexingStatus === 'started' || indexingStatus === 'running';

	useEffect(() => {
		if (typeof window.task?.list !== 'function') return;
		window.task.list().then((res) => {
			if (!res.success) return;
			const active = res.data.find(
				(t) =>
					t.type === 'index-resources' &&
					(t.status === 'queued' || t.status === 'started' || t.status === 'running')
			);
			if (active) {
				setIndexingTaskId(active.taskId);
				setIndexingStatus(active.status);
			}
		});
	}, []);

	useEffect(() => {
		if (typeof window.task?.onEvent !== 'function') return;
		return window.task.onEvent((event: TaskEvent) => {
			if (indexingTaskId && event.taskId === indexingTaskId) {
				setIndexingStatus(event.state);
			}
		});
	}, [indexingTaskId]);

	const isLoading = status === 'idle' || status === 'loading';
	const indexing = indexingTaskActive;

	const [searchQuery, setSearchQuery] = useState('');
	const [typeFilter, setTypeFilter] = useState('all');
	const [editing, setEditing] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [removing, setRemoving] = useState(false);
	const [kbDialogOpen, setKbDialogOpen] = useState(false);
	const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);

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
		if (indexingTaskCompleted) {
			dispatch(loadIndexingInfo());
		}
	}, [dispatch, indexingTaskCompleted]);

	useEffect(() => {
		setSelected((current) => {
			const resourceIds = new Set(resources.map((r) => r.id));
			const nextSelected = new Set([...current].filter((id) => resourceIds.has(id)));
			const hasChanged =
				nextSelected.size !== current.size || [...current].some((id) => !resourceIds.has(id));
			return hasChanged ? nextSelected : current;
		});
	}, [resources, setSelected]);

	const handleIndex = useCallback(async () => {
		if (!workspacePath || indexing) return;
		const res = await window.task.submit({
			type: 'index-resources',
			input: {
				workspacePath,
			},
			metadata: {},
		});
		if (res.success) {
			setIndexingTaskId(res.data.taskId);
			setIndexingStatus('queued');
		}
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
		window.workspace.openWorkspaceFolder();
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

	const handleDeleteKnowledgeBase = useCallback((id: string) => {
		setKnowledgeBases((current) => current.filter((kb) => kb.id !== id));
	}, []);

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
		kbDialogOpen,
		setKbDialogOpen,
		knowledgeBases,
		handleDeleteKnowledgeBase,
	};

	return <Context.Provider value={value}>{children}</Context.Provider>;
}
