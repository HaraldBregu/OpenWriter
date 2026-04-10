import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { FileEntry } from '../../../../../../shared/types';
import type { FileTypeFilter, SortDirection, SortKey, ViewMode } from '../types';
import { useFilesSort } from '../hooks/use-files-sort';
import { useFilesFilter } from '../hooks/use-files-filter';
import { useFilesSelection } from '../hooks/use-files-selection';
import { RESOURCE_SECTIONS } from '../../shared/resource-sections';

interface FilesContextValue {
	entries: FileEntry[];
	filteredEntries: FileEntry[];
	isLoading: boolean;
	uploading: boolean;
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	viewMode: ViewMode;
	setViewMode: (mode: ViewMode) => void;
	typeFilter: FileTypeFilter;
	setTypeFilter: (filter: FileTypeFilter) => void;
	sortKey: SortKey;
	sortDirection: SortDirection;
	handleSort: (key: SortKey) => void;
	selected: Set<string>;
	allChecked: boolean;
	someChecked: boolean;
	handleToggleAll: () => void;
	handleToggleRow: (id: string) => void;
	handleUpload: () => void;
	handleOpenFolder: () => void;
	handleDelete: () => void;
	handleConfirmDelete: () => Promise<void>;
	confirmOpen: boolean;
	setConfirmOpen: (open: boolean) => void;
}

const FilesContext = createContext<FilesContextValue | null>(null);

export function useFilesContext(): FilesContextValue {
	const context = useContext(FilesContext);
	if (!context) {
		throw new Error('useFilesContext must be used within a FilesProvider');
	}
	return context;
}

interface FilesProviderProps {
	readonly children: ReactNode;
}

export function FilesProvider({ children }: FilesProviderProps): ReactElement {
	const entries: FileEntry[] = [];
	const isLoading = false;
	const uploading = false;

	const [searchQuery, setSearchQuery] = useState('');
	const [viewMode, setViewMode] = useState<ViewMode>('list');
	const [typeFilter, setTypeFilter] = useState<FileTypeFilter>('all');
	const [confirmOpen, setConfirmOpen] = useState(false);

	const { sortKey, sortDirection, handleSort } = useFilesSort();
	const filteredEntries = useFilesFilter({
		entries,
		searchQuery,
		typeFilter,
		sortKey,
		sortDirection,
	});
	const { selected, setSelected, allChecked, someChecked, handleToggleAll, handleToggleRow } =
		useFilesSelection({ filteredEntries });

	const handleUpload = useCallback(() => {
		void window.workspace.insertFiles(RESOURCE_SECTIONS.files.uploadExtensions);
	}, []);

	const handleOpenFolder = useCallback(() => {
		void window.workspace.openFilesFolder();
	}, []);

	const handleDelete = useCallback(() => {
		if (selected.size === 0) return;
		setConfirmOpen(true);
	}, [selected]);

	const handleConfirmDelete = useCallback(async () => {
		await Promise.all([...selected].map((id) => window.workspace.deleteFileEntry(id)));
		setSelected(new Set());
		setConfirmOpen(false);
	}, [selected, setSelected]);

	const value: FilesContextValue = {
		entries,
		filteredEntries,
		isLoading,
		uploading,
		searchQuery,
		setSearchQuery,
		viewMode,
		setViewMode,
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
		handleOpenFolder,
		handleDelete,
		handleConfirmDelete,
		confirmOpen,
		setConfirmOpen,
	};

	return <FilesContext.Provider value={value}>{children}</FilesContext.Provider>;
}
