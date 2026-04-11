import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Dispatch, ReactElement, ReactNode, SetStateAction } from 'react';
import type { ImageEntry } from '../../../../../../shared/types';

interface ImagesContextValue {
	images: ImageEntry[];
	setImages: Dispatch<SetStateAction<ImageEntry[]>>;
	filteredImages: ImageEntry[];
	isLoading: boolean;
	setIsLoading: Dispatch<SetStateAction<boolean>>;
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
	const [images, setImages] = useState<ImageEntry[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [editing, setEditing] = useState(false);

	const filteredImages = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return images;
		return images.filter((image) => image.name.toLowerCase().includes(query));
	}, [images, searchQuery]);

	const handleToggleEdit = useCallback(() => {
		setEditing((current) => !current);
	}, []);

	const handleOpenResourcesFolder = useCallback(() => {
		window.workspace.openResourcesFolder();
	}, []);

	const handleUpload = useCallback(() => {
		// Placeholder — image upload pipeline not yet wired.
	}, []);

	const value: ImagesContextValue = {
		images,
		setImages,
		filteredImages,
		isLoading,
		setIsLoading,
		searchQuery,
		setSearchQuery,
		editing,
		handleToggleEdit,
		handleOpenResourcesFolder,
		handleUpload,
	};

	return <ImagesContext.Provider value={value}>{children}</ImagesContext.Provider>;
}
