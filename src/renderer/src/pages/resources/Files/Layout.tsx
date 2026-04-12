import { useEffect, type ReactElement, type ReactNode } from 'react';
import { FilesProvider } from './Provider';
import { useFilesContext } from './hooks/use-files-context';

function Bootstrap(): null {
	const { setEntries, setIsLoading } = useFilesContext();

	useEffect(() => {
		let active = true;

		const loadFiles = async (): Promise<void> => {
			setIsLoading(true);
			try {
				const files = await window.workspace.getResourcesFiles();
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
	}, [setEntries, setIsLoading]);

	return null;
}

interface LayoutProps {
	readonly children: ReactNode;
}

export default function Layout({ children }: LayoutProps): ReactElement {
	return (
		<FilesProvider>
			<Bootstrap />
			{children}
		</FilesProvider>
	);
}
