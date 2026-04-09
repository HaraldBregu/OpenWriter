import React from 'react';
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { Checkbox } from '../ui/Checkbox';
import { cn } from '@/lib/utils';

const AppCheckbox = React.memo(
	React.forwardRef<
		React.ElementRef<typeof CheckboxPrimitive.Root>,
		CheckboxPrimitive.Root.Props
	>(({ className, ...props }, ref) => <Checkbox ref={ref} className={cn(className)} {...props} />)
);
AppCheckbox.displayName = 'AppCheckbox';

export { AppCheckbox };
