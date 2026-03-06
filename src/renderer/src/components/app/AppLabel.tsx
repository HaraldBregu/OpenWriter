import React from 'react';
import { Label } from '../ui/Label';
import { cn } from '@/lib/utils';

const AppLabel = React.memo(
	React.forwardRef<React.ElementRef<typeof Label>, React.ComponentPropsWithoutRef<typeof Label>>(
		({ className, ...props }, ref) => (
			<Label ref={ref} className={cn('text-foreground', className)} {...props} />
		)
	)
);
AppLabel.displayName = 'AppLabel';

export { AppLabel };
