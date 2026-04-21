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

		const loadFiles = async (): Promise<void> => {
			setIsLoading(true);
			try {
				const files = await window.workspace.getFiles();
				if (!active) return;
				setEntries(files);
			} catch {
				if (!active) return;
				setEntries([]);
			} finally {
				if (active) {
					setIsLoading(false);
				}
			}
		};

		void loadFiles();

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
