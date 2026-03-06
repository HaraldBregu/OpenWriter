import React from 'react';
import { Switch } from '../ui/Switch';
import { cn } from '@/lib/utils';
import type { SwitchProps } from '../ui/Switch';

const AppSwitch = React.memo(
	React.forwardRef<HTMLButtonElement, SwitchProps>(({ className, ...props }, ref) => (
		<Switch ref={ref} className={cn(className)} {...props} />
	))
);
AppSwitch.displayName = 'AppSwitch';

export { AppSwitch };
