import { useEffect, type ReactElement, type ReactNode } from 'react';
import { ResourcesProvider, useResourcesContext } from './Provider';
import { useAppSelector } from '@/store';
import { selectCurrentWorkspacePath } from '@/store/workspace';

function Bootstrap(): null {
	const { setResources, setIsLoading } = useResourcesContext();
	const workspacePath = useAppSelector(selectCurrentWorkspacePath);

	useEffect(() => {
		let active = true;

		const loadResources = async (): Promise<void> => {
			setIsLoading(true);
			try {
				const items = await window.workspace.getResources();
				if (!active) return;
				setResources(items);
			} catch {
				if (!active) return;
				setResources([]);
			} finally {
				if (active) {
					setIsLoading(false);
				}
			}
		};

		void loadResources();

		return () => {
			active = false;
		};
	}, [setResources, setIsLoading, workspacePath]);

	return null;
}

interface LayoutProps {
	readonly children: ReactNode;
}

export default function Layout({ children }: LayoutProps): ReactElement {
	return (
		<ResourcesProvider>
			<Bootstrap />
			{children}
		</ResourcesProvider>
	);
}
