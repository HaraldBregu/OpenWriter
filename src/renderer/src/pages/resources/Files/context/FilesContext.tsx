import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import type { Dispatch, ReactElement, ReactNode, SetStateAction } from 'react';
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
	setEntries: Dispatch<SetStateAction<FileEntry[]>>;
	setIsLoading: Dispatch<SetStateAction<boolean>>;
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

	const refreshFiles = useCallback(async () => {
		if (!mountedRef.current) return;
		setIsLoading(true);
		try {
			const files = await window.workspace.getFiles();
			if (!mountedRef.current) return;
			setEntries(files);
		} catch (err) {
			if (!mountedRef.current) return;
			console.error('Failed to load files:', err);
			setEntries([]);
		} finally {
			if (mountedRef.current) {
				setIsLoading(false);
			}
		}
	}, []);

	useEffect(() => {
		const unsubscribeFiles = window.workspace.onFilesChanged(() => {
			void refreshFiles();
		});

		const unsubscribeWorkspace = window.workspace.onChange((event) => {
			if (event.currentPath) {
				void refreshFiles();
				return;
			}

			setEntries([]);
			setSelected(new Set());
		});

		return () => {
			mountedRef.current = false;
			unsubscribeFiles();
			unsubscribeWorkspace();
		};
	}, [refreshFiles, setSelected]);

	useEffect(() => {
		setSelected((current) => {
			const entryIds = new Set(entries.map((entry) => entry.id));
			const nextSelected = new Set([...current].filter((id) => entryIds.has(id)));
			const hasChanged =
				nextSelected.size !== current.size || [...current].some((id) => !entryIds.has(id));
			return hasChanged ? nextSelected : current;
		});
	}, [entries, setSelected]);

	useEffect(() => {
		if (activeFile && !entries.some((entry) => entry.id === activeFile.id)) {
			setActiveFile(null);
			setFileDetailsOpen(false);
		}
	}, [activeFile, entries]);

	const handleOpenFileDetails = useCallback((file: FileEntry) => {
		setActiveFile(file);
		setFileDetailsOpen(true);
	}, []);

	const handleFileDetailsOpenChange = useCallback((open: boolean) => {
		setFileDetailsOpen(open);
		if (!open) {
			setActiveFile(null);
		}
	}, []);

	const handleUpload = useCallback(async () => {
		setUploading(true);
		try {
			const imported = await window.workspace.insertFiles(RESOURCE_SECTIONS.files.uploadExtensions);
			if (imported.length > 0) {
				await refreshFiles();
			}
		} catch (err) {
			console.error('Failed to upload files:', err);
		} finally {
			if (mountedRef.current) {
				setUploading(false);
			}
		}
	}, [refreshFiles]);

	const handleOpenFolder = useCallback(() => {
		void window.workspace.openFilesFolder();
	}, []);

	const handleDelete = useCallback(() => {
		if (selected.size === 0) return;
		setConfirmOpen(true);
	}, [selected]);

	const handleConfirmDelete = useCallback(async () => {
		try {
			await Promise.all([...selected].map((id) => window.workspace.deleteFileEntry(id)));
			setSelected(new Set());
			setConfirmOpen(false);
			await refreshFiles();
		} catch (err) {
			console.error('Failed to delete files:', err);
		}
	}, [refreshFiles, selected, setSelected]);

	const value: FilesContextValue = {
		entries,
		filteredEntries,
		isLoading,
		uploading,
		setEntries,
		setIsLoading,
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
		activeFile,
		fileDetailsOpen,
		handleOpenFileDetails,
		handleFileDetailsOpenChange,
		handleUpload,
		handleOpenFolder,
		handleDelete,
		handleConfirmDelete,
		confirmOpen,
		setConfirmOpen,
	};

	return <FilesContext.Provider value={value}>{children}</FilesContext.Provider>;
}
