import React, { memo, type ReactNode, type ReactElement } from 'react';
import { cn } from '@/lib/utils';

interface AppTitleBarLeftContainerProps {
	readonly isMac: boolean;
	readonly isFullScreen?: boolean;
	readonly className?: string;
	readonly children: ReactNode;
}

export const AppTitleBarLeftContainer = memo(function AppTitleBarLeftContainer({
	isMac,
	isFullScreen = false,
	className,
	children,
}: AppTitleBarLeftContainerProps): ReactElement {
	return (
		<div
			className={cn(
				'flex items-center h-full z-10',
				isMac && (isFullScreen ? 'ml-2' : 'ml-20 mt-1'),
				className
			)}
			style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
		>
			{children}
		</div>
	);
});
