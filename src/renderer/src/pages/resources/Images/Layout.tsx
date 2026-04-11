import { useEffect, type ReactElement, type ReactNode } from 'react';
import { ImagesProvider, useImagesContext } from './context/ImagesContext';

function Bootstrap(): null {
	const { setImages, setIsLoading } = useImagesContext();

	useEffect(() => {
		let active = true;

		const load = async (): Promise<void> => {
			setIsLoading(true);
			try {
				const images = await window.workspace.getResourcesImages();
				if (!active) return;
				setImages(images);
			} catch {
				if (!active) return;
				setImages([]);
			} finally {
				if (active) {
					setIsLoading(false);
				}
			}
		};

		void load();

		return () => {
			active = false;
		};
	}, [setImages, setIsLoading]);

	return null;
}

interface LayoutProps {
	readonly children: ReactNode;
}

export default function Layout({ children }: LayoutProps): ReactElement {
	return (
		<ImagesProvider>
			<Bootstrap />
			{children}
		</ImagesProvider>
	);
}
