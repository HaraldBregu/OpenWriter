import { memo, type ReactNode, type ReactElement } from 'react';
import { cn } from '@/lib/utils';

interface AppTitleBarCenterContainerProps {
	readonly className?: string;
	readonly children: ReactNode;
}

export const AppTitleBarCenterContainer = memo(function AppTitleBarCenterContainer({
	className,
	children,
}: AppTitleBarCenterContainerProps): ReactElement {
	return (
		<div
			className={cn(
				'absolute inset-0 flex items-center justify-center pointer-events-none',
				className
			)}
		>
			{children}
		</div>
	);
});
