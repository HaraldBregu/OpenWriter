import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
	type ReactElement,
	type ReactNode,
} from 'react';
import type { ImageEntry } from '../../../shared/types';

export interface ImagesContextValue {
	images: ImageEntry[];
	isLoading: boolean;
	refresh: () => Promise<void>;
	removeImage: (id: string) => void;
}

const ImagesContext = createContext<ImagesContextValue | undefined>(undefined);

interface ImagesProviderProps {
	readonly children: ReactNode;
}

export function ImagesProvider({ children }: ImagesProviderProps): ReactElement {
	const [images, setImages] = useState<ImageEntry[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const mountedRef = useRef(true);

	const refresh = useCallback(async () => {
		if (!mountedRef.current) return;
		setIsLoading(true);
		try {
			const items = await window.workspace.getImages();
			if (!mountedRef.current) return;
			setImages(items);
		} catch (err) {
			console.error('[ImagesProvider] getImages failed:', err);
			if (!mountedRef.current) return;
			setImages([]);
		} finally {
			if (mountedRef.current) setIsLoading(false);
		}
	}, []);

	const removeImage = useCallback((id: string) => {
		setImages((prev) => prev.filter((entry) => entry.id !== id));
	}, []);

	useEffect(() => {
		mountedRef.current = true;
		void refresh();
		const unsubscribeImages = window.workspace.onImagesChanged(() => {
			void refresh();
		});
		const unsubscribeWorkspace = window.workspace.onChange((event) => {
			if (event.currentPath) {
				void refresh();
				return;
			}
			setImages([]);
		});
		return () => {
			mountedRef.current = false;
			unsubscribeImages();
			unsubscribeWorkspace();
		};
	}, [refresh]);

	return (
		<ImagesContext.Provider value={{ images, isLoading, refresh, removeImage }}>
			{children}
		</ImagesContext.Provider>
	);
}

export function useImagesContext(): ImagesContextValue {
	const ctx = useContext(ImagesContext);
	if (!ctx) throw new Error('useImagesContext must be used within ImagesProvider');
	return ctx;
}
