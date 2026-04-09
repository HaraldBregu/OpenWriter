import { memo, type ReactElement } from 'react';
import { cn } from '@/lib/utils';

interface AppTitleBarCenterContainerTitleProps {
	readonly className?: string;
	readonly children: string;
}

export const AppTitleBarCenterContainerTitle = memo(function AppTitleBarCenterContainerTitle({
	className,
	children,
}: AppTitleBarCenterContainerTitleProps): ReactElement {
	return (
		<span className={cn('text-sm font-normal tracking-wide text-muted-foreground', className)}>
			{children}
		</span>
	);
});
