import { useEffect, type ReactElement, type ReactNode } from 'react';
import { ContentProvider, useContentContext } from './Provider';
import { useAppSelector } from '@/store';
import { selectCurrentWorkspacePath } from '@/store/workspace';

function Bootstrap(): null {
	const { setFolders, setIsLoading } = useContentContext();
	const workspacePath = useAppSelector(selectCurrentWorkspacePath);

	useEffect(() => {
		let active = true;

		const loadFolders = async (): Promise<void> => {
			setIsLoading(true);
			try {
				const folders = await window.workspace.getResourcesContents();
				if (!active) return;
				setFolders(folders);
			} catch {
				if (!active) return;
				setFolders([]);
			} finally {
				if (active) {
					setIsLoading(false);
				}
			}
		};

		void loadFolders();

		return () => {
			active = false;
		};
	}, [setFolders, setIsLoading, workspacePath]);

	return null;
}

interface LayoutProps {
	readonly children: ReactNode;
}

export default function Layout({ children }: LayoutProps): ReactElement {
	return (
		<ContentProvider>
			<Bootstrap />
			{children}
		</ContentProvider>
	);
}
