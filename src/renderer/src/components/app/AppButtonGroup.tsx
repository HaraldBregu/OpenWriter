import React from 'react';
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '../ui/ButtonGroup';
import { cn } from '@/lib/utils';

const AppButtonGroup = React.memo(
	React.forwardRef<
		React.ElementRef<typeof ButtonGroup>,
		React.ComponentPropsWithoutRef<typeof ButtonGroup>
	>(({ className, ...props }, ref) => (
		<ButtonGroup ref={ref} className={cn(className)} {...props} />
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
