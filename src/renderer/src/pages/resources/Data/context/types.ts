import type { ResourceInfo } from '../../../../../../shared/types';
import type { SortDirection, SortKey } from '../types';

export type { ResourceInfo, SortDirection, SortKey };

export interface DataContextValue {
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
	indexingInfo: {
		lastIndexedAt: number;
		indexedCount: number;
		totalChunks: number;
		failedCount: number;
	} | null;
}
