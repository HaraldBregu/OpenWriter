import { createContext, useContext } from 'react';
import type { FolderEntry } from '../../../../../../shared/types';
import type { SortDirection, SortKey } from '../shared/types';

export interface ContentContextValue {
	folders: FolderEntry[];
	setFolders: (folders: FolderEntry[]) => void;
	filteredFolders: FolderEntry[];
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
	handleConfirmDelete: () => Promise<void>;
	confirmOpen: boolean;
	setConfirmOpen: (open: boolean) => void;
	removing: boolean;
}

export const ContentContext = createContext<ContentContextValue | null>(null);

export function useContentContext(): ContentContextValue {
	const context = useContext(ContentContext);
	if (!context) {
		throw new Error('useContentContext must be used within a ContentProvider');
	}
	return context;
}
