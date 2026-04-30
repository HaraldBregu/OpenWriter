import { useEffect, type ReactElement, type ReactNode } from 'react';
import { ContentProvider, useContentContext } from './Provider';
import { useAppSelector } from '@/store';
import { selectCurrentWorkspacePath } from '@/store/workspace';

function Bootstrap(): null {
	const { setContents, setIsLoading } = useContentContext();
	const workspacePath = useAppSelector(selectCurrentWorkspacePath);

	useEffect(() => {
		let active = true;

		const loadContents = async (): Promise<void> => {
			setIsLoading(true);
			try {
				const items = await window.workspace.getContents();
				if (!active) return;
				setContents(items);
			} catch {
				if (!active) return;
				setContents([]);
			} finally {
				if (active) {
					setIsLoading(false);
				}
			}
		};

		void loadContents();

		return () => {
			active = false;
		};
	}, [setContents, setIsLoading, workspacePath]);

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
