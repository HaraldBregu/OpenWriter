import { useEffect, type ReactElement, type ReactNode } from 'react';
import { Provider } from './Provider';
import { useContext } from './hooks/use-context';
import { useAppSelector } from '@/store';
import { selectCurrentWorkspacePath } from '@/store/workspace';

function Bootstrap(): null {
	const { setEntries, setIsLoading } = useContext();
	const workspacePath = useAppSelector(selectCurrentWorkspacePath);

	useEffect(() => {
		let active = true;

		const loadImages = async (): Promise<void> => {
			setIsLoading(true);
			try {
				const images = await window.workspace.getImages();
				if (!active) return;
				setEntries(images);
			} catch {
				if (!active) return;
				setEntries([]);
			} finally {
				if (active) {
					setIsLoading(false);
				}
			}
		};

		void loadImages();

		return () => {
			active = false;
		};
	}, [setEntries, setIsLoading, workspacePath]);

	return null;
}

interface LayoutProps {
	readonly children: ReactNode;
}

export default function Layout({ children }: LayoutProps): ReactElement {
	return (
		<Provider>
			<Bootstrap />
			{children}
		</Provider>
	);
}
