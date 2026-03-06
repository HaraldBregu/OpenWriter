import React from 'react';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '@/lib/utils';

const AppSkeleton = React.memo(function AppSkeleton({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return <Skeleton className={cn('bg-muted', className)} {...props} />;
});
AppSkeleton.displayName = 'AppSkeleton';

export { AppSkeleton };
