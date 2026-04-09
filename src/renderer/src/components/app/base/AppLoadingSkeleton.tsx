import React from 'react';

export const AppLoadingSkeleton = React.memo(function AppLoadingSkeleton() {
	return (
		<div className="flex items-center justify-center h-full">
			<div className="flex flex-col items-center gap-3">
				<div className="h-8 w-8 rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
				<p className="text-sm text-muted-foreground">Loading…</p>
			</div>
		</div>
	);
});
AppLoadingSkeleton.displayName = 'AppLoadingSkeleton';
