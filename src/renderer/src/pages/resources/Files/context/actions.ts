import { useCallback } from 'react';
import type { FileEntry } from './types';
import type { FilesState } from './state';
import { RESOURCE_SECTIONS } from '../../shared/resource-sections';

export interface FilesActions {
	refreshFiles: () => Promise<void>;
	handleOpenFileDetails: (file: FileEntry) => void;
	handleFileDetailsOpenChange: (open: boolean) => void;
	handleUpload: () => Promise<void>;
	handleOpenFolder: () => void;
	toggleEditMode: () => void;
	handleDelete: () => void;
	handleConfirmDelete: () => Promise<void>;
}

export function useFilesActions(state: FilesState): FilesActions {
	const {
		mountedRef,
		setIsLoading,
		setEntries,
		setActiveFile,
		setFileDetailsOpen,
		setUploading,
		setEditMode,
		setConfirmOpen,
		selected,
		setSelected,
	} = state;

	const refreshFiles = useCallback(async () => {
		if (!mountedRef.current) return;
		setIsLoading(true);
		try {
			const files = await window.workspace.getResourcesFiles();
			if (!mountedRef.current) return;
			setEntries(files);
		} catch {
			if (!mountedRef.current) return;
			setEntries([]);
		} finally {
			if (mountedRef.current) {
				setIsLoading(false);
			}
		}
	}, [mountedRef, setIsLoading, setEntries]);

	const handleOpenFileDetails = useCallback(
		(file: FileEntry) => {
			setActiveFile(file);
			setFileDetailsOpen(true);
		},
		[setActiveFile, setFileDetailsOpen],
	);

	const handleFileDetailsOpenChange = useCallback(
		(open: boolean) => {
			setFileDetailsOpen(open);
			if (!open) {
				setActiveFile(null);
			}
		},
		[setFileDetailsOpen, setActiveFile],
	);

	const handleUpload = useCallback(async () => {
		setUploading(true);
		try {
			const imported = await window.workspace.insertResourcesFiles(
				RESOURCE_SECTIONS.files.uploadExtensions,
			);
			if (imported.length > 0) {
				await refreshFiles();
			}
		} catch {
			/* upload failed silently */
		} finally {
			if (mountedRef.current) {
				setUploading(false);
			}
		}
	}, [mountedRef, setUploading, refreshFiles]);

	const handleOpenFolder = useCallback(() => {
		void window.workspace.openFilesFolder();
	}, []);

	const toggleEditMode = useCallback(() => {
		setEditMode((prev) => !prev);
	}, [setEditMode]);

	const handleDelete = useCallback(() => {
		if (selected.size === 0) return;
		setConfirmOpen(true);
	}, [selected, setConfirmOpen]);

	const handleConfirmDelete = useCallback(async () => {
		try {
			await Promise.all([...selected].map((id) => window.workspace.deleteResourcesFileEntry(id)));
			setSelected(new Set());
			setConfirmOpen(false);
			await refreshFiles();
		} catch {
			/* delete failed silently */
		}
	}, [refreshFiles, selected, setSelected, setConfirmOpen]);

	return {
		refreshFiles,
		handleOpenFileDetails,
		handleFileDetailsOpenChange,
		handleUpload,
		handleOpenFolder,
		toggleEditMode,
		handleDelete,
		handleConfirmDelete,
	};
}
