import type { IndexingInfo, ResourceInfo } from '../../../../../../shared/types';
import type { KnowledgeBase, SortDirection, SortKey } from '../types';

export type { IndexingInfo, KnowledgeBase, ResourceInfo, SortDirection, SortKey };

export interface DataContextValue {
	readonly resources: ResourceInfo[];
	readonly filteredResources: ResourceInfo[];
	readonly mimeTypes: string[];
	readonly isLoading: boolean;
	readonly error: string | null;
	readonly uploading: boolean;
	readonly editing: boolean;
	readonly searchQuery: string;
	readonly setSearchQuery: (query: string) => void;
	readonly typeFilter: string;
	readonly setTypeFilter: (filter: string) => void;
	readonly sortKey: SortKey;
	readonly sortDirection: SortDirection;
	readonly handleSort: (key: SortKey) => void;
	readonly selected: Set<string>;
	readonly allChecked: boolean;
	readonly someChecked: boolean;
	readonly handleToggleAll: () => void;
	readonly handleToggleRow: (id: string) => void;
	readonly handleUpload: () => void;
	readonly handleToggleEdit: () => void;
	readonly handleOpenResourcesFolder: () => void;
	readonly handleOpenDataFolder: () => void;
	readonly handleDelete: () => void;
	readonly handleConfirmDelete: () => Promise<void>;
	readonly handleIndex: () => void;
	readonly confirmOpen: boolean;
	readonly setConfirmOpen: (open: boolean) => void;
	readonly removing: boolean;
	readonly indexing: boolean;
	readonly indexingInfo: IndexingInfo | null;
	readonly kbDialogOpen: boolean;
	readonly setKbDialogOpen: (open: boolean) => void;
	readonly knowledgeBases: KnowledgeBase[];
	readonly handleDeleteKnowledgeBase: (id: string) => void;
}
