import React from 'react';
import {
	AlertDialog,
	AlertDialogPortal,
	AlertDialogOverlay,
	AlertDialogTrigger,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogAction,
	AlertDialogCancel,
} from '../ui/AlertDialog';
import { cn } from '@/lib/utils';

const AppAlertDialog = AlertDialog;
const AppAlertDialogTrigger = AlertDialogTrigger;
const AppAlertDialogPortal = AlertDialogPortal;

const AppAlertDialogOverlay = React.forwardRef<
	React.ElementRef<typeof AlertDialogOverlay>,
	React.ComponentPropsWithoutRef<typeof AlertDialogOverlay>
>(({ className, ...props }, ref) => (
	<AlertDialogOverlay ref={ref} className={cn('bg-background/80', className)} {...props} />
));
AppAlertDialogOverlay.displayName = 'AppAlertDialogOverlay';

const AppAlertDialogContent = React.forwardRef<
	React.ElementRef<typeof AlertDialogContent>,
	React.ComponentPropsWithoutRef<typeof AlertDialogContent>
>(({ className, ...props }, ref) => (
	<AlertDialogContent
		ref={ref}
		className={cn('border-border bg-background text-foreground', className)}
		{...props}
	/>
));
AppAlertDialogContent.displayName = 'AppAlertDialogContent';

const AppAlertDialogHeader = React.memo(function AppAlertDialogHeader({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return <AlertDialogHeader className={cn('text-foreground', className)} {...props} />;
});
AppAlertDialogHeader.displayName = 'AppAlertDialogHeader';

const AppAlertDialogFooter = React.memo(function AppAlertDialogFooter({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return <AlertDialogFooter className={cn('border-border', className)} {...props} />;
});
AppAlertDialogFooter.displayName = 'AppAlertDialogFooter';

const AppAlertDialogTitle = React.forwardRef<
	React.ElementRef<typeof AlertDialogTitle>,
	React.ComponentPropsWithoutRef<typeof AlertDialogTitle>
>(({ className, ...props }, ref) => (
	<AlertDialogTitle ref={ref} className={cn('text-foreground', className)} {...props} />
));
AppAlertDialogTitle.displayName = 'AppAlertDialogTitle';

const AppAlertDialogDescription = React.forwardRef<
	React.ElementRef<typeof AlertDialogDescription>,
	React.ComponentPropsWithoutRef<typeof AlertDialogDescription>
>(({ className, ...props }, ref) => (
	<AlertDialogDescription ref={ref} className={cn('text-muted-foreground', className)} {...props} />
));
AppAlertDialogDescription.displayName = 'AppAlertDialogDescription';

const AppAlertDialogAction = AlertDialogAction;
const AppAlertDialogCancel = AlertDialogCancel;

export {
	AppAlertDialog,
	AppAlertDialogPortal,
	AppAlertDialogOverlay,
	AppAlertDialogTrigger,
	AppAlertDialogContent,
	AppAlertDialogHeader,
	AppAlertDialogFooter,
	AppAlertDialogTitle,
	AppAlertDialogDescription,
	AppAlertDialogAction,
	AppAlertDialogCancel,
};
