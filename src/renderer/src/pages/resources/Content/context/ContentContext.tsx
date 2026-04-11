import { createContext, useCallback, useContext, useState } from 'react';
import type { Dispatch, ReactElement, ReactNode, SetStateAction } from 'react';
import type { FolderEntry } from '../../../../../../shared/types';
import type { SortDirection, SortKey } from '../types';
import { useContentSort } from '../hooks/use-content-sort';
import { useContentFilter } from '../hooks/use-content-filter';
import { useContentSelection } from '../hooks/use-content-selection';
import { RESOURCE_SECTIONS } from '../../shared/resource-sections';

interface ContentContextValue {
	folders: FolderEntry[];
	setFolders: Dispatch<SetStateAction<FolderEntry[]>>;
	filteredFolders: FolderEntry[];
	isLoading: boolean;
	setIsLoading: Dispatch<SetStateAction<boolean>>;
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
	handleUpload: () => void;
	handleToggleEdit: () => void;
	handleOpenResourcesFolder: () => void;
	handleDelete: () => void;
	handleConfirmDelete: () => Promise<void>;
	confirmOpen: boolean;
	setConfirmOpen: (open: boolean) => void;
	removing: boolean;
}

const ContentContext = createContext<ContentContextValue | null>(null);

export function useContentContext(): ContentContextValue {
	const context = useContext(ContentContext);
	if (!context) {
		throw new Error('useContentContext must be used within a ContentProvider');
	}
	return context;
}

interface ContentProviderProps {
	readonly children: ReactNode;
}

export function ContentProvider({ children }: ContentProviderProps): ReactElement {
	const section = RESOURCE_SECTIONS.content;

	const [folders, setFolders] = useState<FolderEntry[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [uploading, setUploading] = useState(false);

	const [searchQuery, setSearchQuery] = useState('');
	const [editing, setEditing] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [removing, setRemoving] = useState(false);

	const { sortKey, sortDirection, handleSort } = useContentSort();
	const filteredFolders = useContentFilter({
		folders,
		searchQuery,
		sortKey,
		sortDirection,
	});
	const { selected, setSelected, allChecked, someChecked, handleToggleAll, handleToggleRow } =
		useContentSelection({ filteredFolders });

	const refreshFolders = useCallback(async () => {
		setIsLoading(true);
		try {
			const next = await window.workspace.getResourcesContents();
			setFolders(next);
		} catch {
			setFolders([]);
		} finally {
			setIsLoading(false);
		}
	}, []);

	const handleUpload = useCallback(async () => {
		setUploading(true);
		try {
			const imported = await window.workspace.insertContents(section.uploadExtensions);
			if (imported.length > 0) {
				await refreshFolders();
			}
		} catch {
			// Swallow picker-cancellation and validation errors
		} finally {
			setUploading(false);
		}
	}, [section, refreshFolders]);

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
			await Promise.all(ids.map((id) => window.workspace.deleteContent(id)));
			await refreshFolders();
			setSelected(new Set());
		} finally {
			setRemoving(false);
		}
	}, [selected, refreshFolders, setSelected]);

	const value: ContentContextValue = {
		folders,
		setFolders,
		filteredFolders,
		isLoading,
		setIsLoading,
		uploading,
		editing,
		searchQuery,
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
		handleConfirmDelete,
		confirmOpen,
		setConfirmOpen,
		removing,
	};

	return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}
