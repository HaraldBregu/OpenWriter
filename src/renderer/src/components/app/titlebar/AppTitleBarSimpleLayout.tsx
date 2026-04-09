import { memo, type ReactElement } from 'react';
import { TitleBar } from '../../TitleBar';

interface AppTitleBarSimpleLayoutProps {
	readonly title?: string;
}

export const AppTitleBarSimpleLayout = memo(function AppTitleBarSimpleLayout({
	title = 'OpenWriter',
}: AppTitleBarSimpleLayoutProps): ReactElement {
	return <TitleBar title={title} />;
});
