import { useEffect, type ReactElement, type ReactNode } from 'react';
import { FilesProvider, useFilesContext } from './context/FilesContext';

function FilesBootstrap(): null {
	const { setEntries, setIsLoading } = useFilesContext();

	useEffect(() => {
		let active = true;

		const loadFiles = async (): Promise<void> => {
			setIsLoading(true);
			try {
				const files = await window.workspace.getFiles();
				if (!active) return;
				setEntries(files);
			} catch (err) {
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

interface FilesLayoutProps {
	readonly children: ReactNode;
}

export default function FilesLayout({ children }: FilesLayoutProps): ReactElement {
	return (
		<FilesProvider>
			<FilesBootstrap />
			{children}
		</FilesProvider>
	);
}
