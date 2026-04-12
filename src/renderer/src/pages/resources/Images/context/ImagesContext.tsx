import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Dispatch, ReactElement, ReactNode, SetStateAction } from 'react';
import type { ImageEntry } from '../../../../../../shared/types';
import { RESOURCE_SECTIONS } from '../../shared/resource-sections';

interface ImagesContextValue {
	images: ImageEntry[];
	setImages: Dispatch<SetStateAction<ImageEntry[]>>;
	filteredImages: ImageEntry[];
	isLoading: boolean;
	setIsLoading: Dispatch<SetStateAction<boolean>>;
	uploading: boolean;
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	editing: boolean;
	handleToggleEdit: () => void;
	handleOpenResourcesFolder: () => void;
	handleUpload: () => void;
}

const ImagesContext = createContext<ImagesContextValue | null>(null);

export function useImagesContext(): ImagesContextValue {
	const context = useContext(ImagesContext);
	if (!context) {
		throw new Error('useImagesContext must be used within an ImagesProvider');
	}
	return context;
}

interface ImagesProviderProps {
	readonly children: ReactNode;
}

export function ImagesProvider({ children }: ImagesProviderProps): ReactElement {
	const section = RESOURCE_SECTIONS.images;
	const [images, setImages] = useState<ImageEntry[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [uploading, setUploading] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [editing, setEditing] = useState(false);

	const filteredImages = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return images;
		return images.filter((image) => image.name.toLowerCase().includes(query));
	}, [images, searchQuery]);

	const refreshImages = useCallback(async () => {
		setIsLoading(true);
		try {
			const next = await window.workspace.getResourcesImages();
			setImages(next);
		} catch {
			setImages([]);
		} finally {
			setIsLoading(false);
		}
	}, []);

	const handleToggleEdit = useCallback(() => {
		setEditing((current) => !current);
	}, []);

	const handleOpenResourcesFolder = useCallback(() => {
		window.workspace.openResourcesFolder();
	}, []);

	const handleUpload = useCallback(async () => {
		setUploading(true);
		try {
			const imported = await window.workspace.insertResourcesImages(section.uploadExtensions);
			if (imported.length > 0) {
				await refreshImages();
			}
		} catch {
			// Swallow picker-cancellation and validation errors
		} finally {
			setUploading(false);
		}
	}, [section, refreshImages]);

	const value: ImagesContextValue = {
		images,
		setImages,
		filteredImages,
		isLoading,
		setIsLoading,
		uploading,
		searchQuery,
		setSearchQuery,
		editing,
		handleToggleEdit,
		handleOpenResourcesFolder,
		handleUpload,
	};

	return <ImagesContext.Provider value={value}>{children}</ImagesContext.Provider>;
}
