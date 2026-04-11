import { createContext, useCallback, useContext, useState } from 'react';
import type { Dispatch, ReactElement, ReactNode, SetStateAction } from 'react';
import type { GallerySection } from '@/components/app/Gallery';

interface ImagesContextValue {
	sections: GallerySection[];
	setSections: Dispatch<SetStateAction<GallerySection[]>>;
	filteredSections: GallerySection[];
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
	const [sections, setSections] = useState<GallerySection[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [editing, setEditing] = useState(false);

	const filteredSections = sections;

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
		sections,
		setSections,
		filteredSections,
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
