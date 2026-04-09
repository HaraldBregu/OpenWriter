import React, { memo, type ReactNode, type ReactElement } from 'react';
import { cn } from '@/lib/utils';

interface AppTitleBarContainerProps {
	readonly className?: string;
	readonly children: ReactNode;
}

export const AppTitleBarContainer = memo(function AppTitleBarContainer({
	className,
	children,
}: AppTitleBarContainerProps): ReactElement {
	return (
		<div
			className={cn(
				'relative z-20 flex h-12 shrink-0 items-center select-none border-b border-border backdrop-blur-md',
				className
			)}
			style={
				{
					WebkitAppRegion: 'drag',
					backgroundColor: 'var(--title-bar-background, hsl(var(--card) / 0.95))',
				} as React.CSSProperties
			}
		>
			{children}
		</div>
	);
});
