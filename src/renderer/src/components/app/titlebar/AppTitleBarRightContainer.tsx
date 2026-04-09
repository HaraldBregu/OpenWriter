import React, { memo, type ReactNode, type ReactElement } from 'react';
import { cn } from '@/lib/utils';

interface AppTitleBarRightContainerProps {
	readonly className?: string;
	readonly children: ReactNode;
}

export const AppTitleBarRightContainer = memo(function AppTitleBarRightContainer({
	className,
	children,
}: AppTitleBarRightContainerProps): ReactElement {
	return (
		<div
			className={cn('flex items-center h-full z-10', className)}
			style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
		>
			{children}
		</div>
	);
});
