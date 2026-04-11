import { useEffect, type ReactElement, type ReactNode } from 'react';
import { ImagesProvider, useImagesContext } from './context/ImagesContext';
import { loadImagesSections } from './hooks/use-images-sections';

function Bootstrap(): null {
	const { setSections, setIsLoading } = useImagesContext();

	useEffect(() => {
		let active = true;

		const load = async (): Promise<void> => {
			setIsLoading(true);
			try {
				const sections = await loadImagesSections();
				if (!active) return;
				setSections(sections);
			} catch {
				if (!active) return;
				setSections([]);
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
	}, [setSections, setIsLoading]);

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
