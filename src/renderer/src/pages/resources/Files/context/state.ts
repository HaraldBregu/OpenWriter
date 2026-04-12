import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useRef, useState } from 'react';
import type { FileEntry, FileTypeFilter, SortDirection, SortKey, ViewMode } from './types';
import { useFilesSort } from '../hooks/use-files-sort';
import { useFilesFilter } from '../hooks/use-files-filter';
import { useFilesSelection } from '../hooks/use-files-selection';

export interface FilesState {
	mountedRef: MutableRefObject<boolean>;
	entries: FileEntry[];
	setEntries: Dispatch<SetStateAction<FileEntry[]>>;
	isLoading: boolean;
	setIsLoading: Dispatch<SetStateAction<boolean>>;
	uploading: boolean;
	setUploading: Dispatch<SetStateAction<boolean>>;
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	viewMode: ViewMode;
	setViewMode: (mode: ViewMode) => void;
	typeFilter: FileTypeFilter;
	setTypeFilter: (filter: FileTypeFilter) => void;
	confirmOpen: boolean;
	setConfirmOpen: (open: boolean) => void;
	activeFile: FileEntry | null;
	setActiveFile: Dispatch<SetStateAction<FileEntry | null>>;
	fileDetailsOpen: boolean;
	setFileDetailsOpen: Dispatch<SetStateAction<boolean>>;
	editMode: boolean;
	setEditMode: Dispatch<SetStateAction<boolean>>;
	sortKey: SortKey;
	sortDirection: SortDirection;
	handleSort: (key: SortKey) => void;
	filteredEntries: FileEntry[];
	selected: Set<string>;
	setSelected: Dispatch<SetStateAction<Set<string>>>;
	allChecked: boolean;
	someChecked: boolean;
	handleToggleAll: () => void;
	handleToggleRow: (id: string) => void;
}

export function useFilesState(): FilesState {
	const mountedRef = useRef(true);
	const [entries, setEntries] = useState<FileEntry[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [uploading, setUploading] = useState(false);

	const [searchQuery, setSearchQuery] = useState('');
	const [viewMode, setViewMode] = useState<ViewMode>('list');
	const [typeFilter, setTypeFilter] = useState<FileTypeFilter>('all');
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [activeFile, setActiveFile] = useState<FileEntry | null>(null);
	const [fileDetailsOpen, setFileDetailsOpen] = useState(false);
	const [editMode, setEditMode] = useState(false);

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

	return {
		mountedRef,
		entries,
		setEntries,
		isLoading,
		setIsLoading,
		uploading,
		setUploading,
		searchQuery,
		setSearchQuery,
		viewMode,
		setViewMode,
		typeFilter,
		setTypeFilter,
		confirmOpen,
		setConfirmOpen,
		activeFile,
		setActiveFile,
		fileDetailsOpen,
		setFileDetailsOpen,
		editMode,
		setEditMode,
		sortKey,
		sortDirection,
		handleSort,
		filteredEntries,
		selected,
		setSelected,
		allChecked,
		someChecked,
		handleToggleAll,
		handleToggleRow,
	};
}
