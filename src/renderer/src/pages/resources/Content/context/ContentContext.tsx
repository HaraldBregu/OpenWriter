import { createContext, useCallback, useContext, useState } from 'react';
import type { Dispatch, ReactElement, ReactNode, SetStateAction } from 'react';
import type { FolderEntry, ResourceInfo } from '../../../../../../shared/types';
import type { SortDirection, SortKey } from '../types';
import { useContentSort } from '../hooks/use-content-sort';
import { useContentFilter } from '../hooks/use-content-filter';
import { useContentSelection } from '../hooks/use-content-selection';
import { useContentData } from '../hooks/use-content-data';
import { RESOURCE_SECTIONS } from '../../shared/resource-sections';

interface ContentContextValue {
	resources: ResourceInfo[];
	filteredResources: ResourceInfo[];
	folders: FolderEntry[];
	setFolders: Dispatch<SetStateAction<FolderEntry[]>>;
	isLoading: boolean;
	setIsLoading: Dispatch<SetStateAction<boolean>>;
	error: string | null;
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
	previewResource: ResourceInfo | null;
	setPreviewResource: (resource: ResourceInfo | null) => void;
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
	const {
		resources,
		isLoading: dataLoading,
		error,
		uploading,
		loadContent,
		setUploading,
	} = useContentData();

	const [folders, setFolders] = useState<FolderEntry[]>([]);
	const [bootstrapLoading, setBootstrapLoading] = useState(true);
	const isLoading = dataLoading || bootstrapLoading;

	const [searchQuery, setSearchQuery] = useState('');
	const [editing, setEditing] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [removing, setRemoving] = useState(false);
	const [previewResource, setPreviewResource] = useState<ResourceInfo | null>(null);

	const { sortKey, sortDirection, handleSort } = useContentSort();
	const filteredResources = useContentFilter({
		resources,
		searchQuery,
		sortKey,
		sortDirection,
	});
	const { selected, setSelected, allChecked, someChecked, handleToggleAll, handleToggleRow } =
		useContentSelection({ filteredResources });

	const handleUpload = useCallback(async () => {
		setUploading(true);
		try {
			const imported = await window.workspace.insertContents(section.uploadExtensions);
			if (imported.length > 0) {
				await loadContent();
			}
		} catch {
			// Swallow picker-cancellation and validation errors
		} finally {
			setUploading(false);
		}
	}, [section, loadContent, setUploading]);

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
			await loadContent();
			setSelected(new Set());
		} finally {
			setRemoving(false);
		}
	}, [selected, loadContent, setSelected]);

	const value: ContentContextValue = {
		resources,
		filteredResources,
		isLoading,
		error,
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
		previewResource,
		setPreviewResource,
	};

	return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}
