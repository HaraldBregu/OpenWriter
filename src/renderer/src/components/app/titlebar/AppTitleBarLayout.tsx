import { memo, type ReactElement } from 'react';
import { TitleBar } from '../../TitleBar';

interface AppTitleBarLayoutProps {
	readonly title?: string;
	readonly onToggleSidebar?: () => void;
	readonly onNavigateBack?: () => void;
	readonly onNavigateForward?: () => void;
}

export const AppTitleBarLayout = memo(function AppTitleBarLayout({
	title,
	onToggleSidebar,
	onNavigateBack,
	onNavigateForward,
}: AppTitleBarLayoutProps): ReactElement {
	return (
		<TitleBar
			title={title}
			onToggleSidebar={onToggleSidebar}
			onNavigateBack={onNavigateBack}
			onNavigateForward={onNavigateForward}
		/>
	);
});
