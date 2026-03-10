import React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Checkbox } from '../ui/Checkbox';
import { cn } from '@/lib/utils';

const AppCheckbox = React.memo(
	React.forwardRef<
		React.ElementRef<typeof CheckboxPrimitive.Root>,
		React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
	>(({ className, ...props }, ref) => (
		<Checkbox ref={ref} className={cn(className)} {...props} />
	))
);
AppCheckbox.displayName = 'AppCheckbox';

export { AppCheckbox };
