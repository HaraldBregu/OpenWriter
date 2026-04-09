import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '../ui/ButtonGroup';
import { cn } from '@/lib/utils';

const buttonGroupVariants = cva(
	"flex w-fit items-stretch *:focus-visible:relative *:focus-visible:z-10 has-[>[data-slot=button-group]]:gap-2 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-lg [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
	{
		variants: {
			orientation: {
				horizontal:
					'*:data-slot:rounded-r-none [&>[data-slot]:not(:has(~[data-slot]))]:rounded-r-lg! [&>[data-slot]~[data-slot]]:rounded-l-none [&>[data-slot]~[data-slot]]:border-l-0',
				vertical:
					'flex-col *:data-slot:rounded-b-none [&>[data-slot]:not(:has(~[data-slot]))]:rounded-b-lg! [&>[data-slot]~[data-slot]]:rounded-t-none [&>[data-slot]~[data-slot]]:border-t-0',
			},
		},
		defaultVariants: {
			orientation: 'horizontal',
		},
	}
);

const AppButtonGroup = React.memo(
	React.forwardRef<
		HTMLDivElement,
		React.ComponentPropsWithoutRef<'div'> & VariantProps<typeof buttonGroupVariants>
	>(({ className, orientation, ...props }, ref) => (
		<div
			ref={ref}
			role="group"
			data-slot="button-group"
			data-orientation={orientation}
			className={cn(buttonGroupVariants({ orientation }), className)}
			{...props}
		/>
	))
);
AppButtonGroup.displayName = 'AppButtonGroup';

const AppButtonGroupSeparator = React.memo(
	React.forwardRef<
		React.ElementRef<typeof ButtonGroupSeparator>,
		React.ComponentPropsWithoutRef<typeof ButtonGroupSeparator>
	>(({ className, ...props }, ref) => (
		<ButtonGroupSeparator ref={ref} className={cn(className)} {...props} />
	))
);
AppButtonGroupSeparator.displayName = 'AppButtonGroupSeparator';

const AppButtonGroupText = React.memo(
	React.forwardRef<
		React.ElementRef<typeof ButtonGroupText>,
		React.ComponentPropsWithoutRef<typeof ButtonGroupText>
	>(({ className, ...props }, ref) => (
		<ButtonGroupText ref={ref} className={cn(className)} {...props} />
	))
);
AppButtonGroupText.displayName = 'AppButtonGroupText';

export { AppButtonGroup, AppButtonGroupSeparator, AppButtonGroupText };
