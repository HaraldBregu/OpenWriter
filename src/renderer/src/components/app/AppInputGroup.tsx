import React from 'react';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
} from '../ui/InputGroup';
import { cn } from '@/lib/utils';

const AppInputGroup = React.memo(
	React.forwardRef<
		React.ElementRef<typeof InputGroup>,
		React.ComponentPropsWithoutRef<typeof InputGroup>
	>(({ className, ...props }, ref) => (
		<InputGroup
			ref={ref}
			className={cn(
				'border-input bg-background text-foreground placeholder:text-muted-foreground',
				className
			)}
			{...props}
		/>
	))
);
AppInputGroup.displayName = 'AppInputGroup';

const AppInputGroupAddon = React.memo(
	React.forwardRef<
		React.ElementRef<typeof InputGroupAddon>,
		React.ComponentPropsWithoutRef<typeof InputGroupAddon>
	>(({ className, ...props }, ref) => (
		<InputGroupAddon ref={ref} className={cn(className)} {...props} />
	))
);
AppInputGroupAddon.displayName = 'AppInputGroupAddon';

const AppInputGroupButton = React.memo(
	React.forwardRef<
		React.ElementRef<typeof InputGroupButton>,
		React.ComponentPropsWithoutRef<typeof InputGroupButton>
	>(({ className, ...props }, ref) => (
		<InputGroupButton ref={ref} className={cn(className)} {...props} />
	))
);
AppInputGroupButton.displayName = 'AppInputGroupButton';

const AppInputGroupInput = React.memo(
	React.forwardRef<
		React.ElementRef<typeof InputGroupInput>,
		React.ComponentPropsWithoutRef<typeof InputGroupInput>
	>(({ className, ...props }, ref) => (
		<InputGroupInput ref={ref} className={cn(className)} {...props} />
	))
);
AppInputGroupInput.displayName = 'AppInputGroupInput';

const AppInputGroupText = React.memo(
	React.forwardRef<
		React.ElementRef<typeof InputGroupText>,
		React.ComponentPropsWithoutRef<typeof InputGroupText>
	>(({ className, ...props }, ref) => (
		<InputGroupText ref={ref} className={cn(className)} {...props} />
	))
);
AppInputGroupText.displayName = 'AppInputGroupText';

const AppInputGroupTextarea = React.memo(
	React.forwardRef<
		React.ElementRef<typeof InputGroupTextarea>,
		React.ComponentPropsWithoutRef<typeof InputGroupTextarea>
	>(({ className, ...props }, ref) => (
		<InputGroupTextarea ref={ref} className={cn(className)} {...props} />
	))
);
AppInputGroupTextarea.displayName = 'AppInputGroupTextarea';

export {
	AppInputGroup,
	AppInputGroupAddon,
	AppInputGroupButton,
	AppInputGroupInput,
	AppInputGroupText,
	AppInputGroupTextarea,
};
