'use client';

import * as React from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';

import { cn } from '@/lib/utils';

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
	return <PopoverPrimitive.Root {...props} />;
}

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
	React.ElementRef<typeof PopoverPrimitive.Popup>,
	PopoverPrimitive.Popup.Props &
		Pick<PopoverPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>
>(({ className, align = 'center', sideOffset = 4, side, alignOffset, ...props }, ref) => (
	<PopoverPrimitive.Portal>
		<PopoverPrimitive.Positioner
			align={align}
			alignOffset={alignOffset}
			side={side}
			sideOffset={sideOffset}
		>
			<PopoverPrimitive.Popup
				ref={ref}
				className={cn(
					'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--transform-origin)',
					className
				)}
				{...props}
			/>
		</PopoverPrimitive.Positioner>
	</PopoverPrimitive.Portal>
));
PopoverContent.displayName = 'PopoverContent';

function PopoverHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn('flex flex-col gap-1', className)}
			{...props}
		/>
	);
}

function PopoverTitle({ className, ...props }: React.ComponentProps<'p'>) {
	return (
		<p
			className={cn('text-sm font-medium leading-none', className)}
			{...props}
		/>
	);
}

function PopoverDescription({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn('text-sm text-muted-foreground', className)}
			{...props}
		/>
	);
}

export { Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle, PopoverDescription };
