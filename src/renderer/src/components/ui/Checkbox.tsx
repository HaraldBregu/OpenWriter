'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { CheckIcon } from 'lucide-react';

import { cn } from 'src/renderer/src/lib/utils';

const Checkbox = React.forwardRef<
	React.ElementRef<typeof CheckboxPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
	<CheckboxPrimitive.Root
		ref={ref}
		data-slot="checkbox"
		className={cn(
			'border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 flex size-4 items-center justify-center rounded-[4px] border transition-colors focus-visible:ring-3 peer relative shrink-0 outline-none disabled:cursor-not-allowed disabled:opacity-50',
			className
		)}
		{...props}
	>
		<CheckboxPrimitive.Indicator
			data-slot="checkbox-indicator"
			className="[&>svg]:size-3.5 grid place-content-center text-current transition-none"
		>
			<CheckIcon />
		</CheckboxPrimitive.Indicator>
	</CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
