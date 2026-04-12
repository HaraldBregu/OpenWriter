import type {
	FileEntry,
	ResourcesFileTypeFilter as FileTypeFilter,
	ResourcesFilesSortDirection as SortDirection,
	ResourcesFilesSortKey as SortKey,
	ResourcesFilesViewMode as ViewMode,
} from '../../../../../../shared/types';

export type { FileEntry, FileTypeFilter, SortDirection, SortKey, ViewMode };

export interface FilesContextValue {
	entries: FileEntry[];
	filteredEntries: FileEntry[];
	isLoading: boolean;
	uploading: boolean;
	setEntries: (entries: FileEntry[]) => void;
	setIsLoading: (loading: boolean) => void;
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
	activeFile: FileEntry | null;
	fileDetailsOpen: boolean;
	handleOpenFileDetails: (file: FileEntry) => void;
	handleFileDetailsOpenChange: (open: boolean) => void;
	handleUpload: () => void;
	handleOpenFolder: () => void;
	handleDelete: () => void;
	handleConfirmDelete: () => Promise<void>;
	confirmOpen: boolean;
	setConfirmOpen: (open: boolean) => void;
	editMode: boolean;
	toggleEditMode: () => void;
}
