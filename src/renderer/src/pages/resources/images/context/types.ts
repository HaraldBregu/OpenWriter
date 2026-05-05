import type {
	ResourceInfo,
	FileTypeFilter,
	FilesSortDirection as SortDirection,
	FilesSortKey as SortKey,
	FilesViewMode as ViewMode,
} from '../../../../../../shared/types';

export type { FileTypeFilter, SortDirection, SortKey, ViewMode };
export type FileEntry = ResourceInfo;

export interface FilesContextValue {
	entries: ResourceInfo[];
	filteredEntries: ResourceInfo[];
	isLoading: boolean;
	uploading: boolean;
	removeEntry: (id: string) => void;
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
	activeFile: ResourceInfo | null;
	fileDetailsOpen: boolean;
	handleOpenFileDetails: (file: ResourceInfo) => void;
	handleFileDetailsOpenChange: (open: boolean) => void;
	handleUpload: () => void;
	handleOpenFolder: () => void;
	handleDelete: () => void;
	handleDeleteOne: (id: string) => void;
	handleDeleteMany: (ids: string[]) => void;
	handleConfirmDelete: () => Promise<void>;
	confirmOpen: boolean;
	setConfirmOpen: (open: boolean) => void;
	editMode: boolean;
	toggleEditMode: () => void;
}
