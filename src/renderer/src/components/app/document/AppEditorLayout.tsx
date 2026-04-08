import { memo, type ReactNode, type ReactElement } from 'react';

interface AppEditorLayoutProps {
	readonly children: ReactNode;
}

export const AppEditorLayout = memo(function AppEditorLayout({
	children,
}: AppEditorLayoutProps): ReactElement {
	return (
		<div className="h-full min-w-0 flex flex-col">
			<div className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
				<div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-10 py-10">{children}</div>
			</div>
		</div>
	);
});
