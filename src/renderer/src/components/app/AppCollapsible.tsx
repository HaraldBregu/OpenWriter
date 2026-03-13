import React from 'react';
import { Collapsible } from '@base-ui/react';
import { cn } from '@/lib/utils';

const AppCollapsible = Collapsible.Root;

const AppCollapsibleTrigger = React.memo(
	React.forwardRef<
		React.ElementRef<typeof Collapsible.Trigger>,
		React.ComponentPropsWithoutRef<typeof Collapsible.Trigger>
	>(({ className, ...props }, ref) => (
		<Collapsible.Trigger
			ref={ref}
			className={cn('flex w-full items-center', className)}
			{...props}
		/>
	))
);
AppCollapsibleTrigger.displayName = 'AppCollapsibleTrigger';

const AppCollapsiblePanel = React.memo(
	React.forwardRef<
		React.ElementRef<typeof Collapsible.Panel>,
		React.ComponentPropsWithoutRef<typeof Collapsible.Panel>
	>(({ className, ...props }, ref) => (
		<Collapsible.Panel ref={ref} className={cn('overflow-hidden', className)} {...props} />
	))
);
AppCollapsiblePanel.displayName = 'AppCollapsiblePanel';

export { AppCollapsible, AppCollapsibleTrigger, AppCollapsiblePanel };
