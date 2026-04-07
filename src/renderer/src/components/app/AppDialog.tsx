import React from 'react';
import {
	Dialog,
	DialogPortal,
	DialogOverlay,
	DialogTrigger,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
	DialogDescription,
} from '../ui/Dialog';
import { cn } from '@/lib/utils';

const AppDialog = Dialog;
const AppDialogTrigger = DialogTrigger;
const AppDialogPortal = DialogPortal;
const AppDialogClose = DialogClose;

const AppDialogOverlay = React.forwardRef<
	React.ElementRef<typeof DialogOverlay>,
	React.ComponentPropsWithoutRef<typeof DialogOverlay>
>(({ className, ...props }, ref) => (
	<DialogOverlay ref={ref} className={cn('bg-background/80', className)} {...props} />
));
AppDialogOverlay.displayName = 'AppDialogOverlay';

const AppDialogContent = React.forwardRef<
	React.ElementRef<typeof DialogContent>,
	React.ComponentPropsWithoutRef<typeof DialogContent>
>(({ className, ...props }, ref) => (
	<DialogContent
		ref={ref}
		className={cn('border-border bg-background text-foreground', className)}
		{...props}
	/>
));
AppDialogContent.displayName = 'AppDialogContent';

const AppDialogHeader = React.memo(function AppDialogHeader({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return <DialogHeader className={cn('text-foreground', className)} {...props} />;
});
AppDialogHeader.displayName = 'AppDialogHeader';

const AppDialogFooter = React.memo(function AppDialogFooter({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return <DialogFooter className={cn('border-border', className)} {...props} />;
});
AppDialogFooter.displayName = 'AppDialogFooter';

const AppDialogTitle = React.forwardRef<
	React.ElementRef<typeof DialogTitle>,
	React.ComponentPropsWithoutRef<typeof DialogTitle>
>(({ className, ...props }, ref) => (
	<DialogTitle ref={ref} className={cn('text-foreground', className)} {...props} />
));
AppDialogTitle.displayName = 'AppDialogTitle';

const AppDialogDescription = React.forwardRef<
	React.ElementRef<typeof DialogDescription>,
	React.ComponentPropsWithoutRef<typeof DialogDescription>
>(({ className, ...props }, ref) => (
	<DialogDescription ref={ref} className={cn('text-muted-foreground', className)} {...props} />
));
AppDialogDescription.displayName = 'AppDialogDescription';

export {
	AppDialog,
	AppDialogPortal,
	AppDialogOverlay,
	AppDialogTrigger,
	AppDialogClose,
	AppDialogContent,
	AppDialogHeader,
	AppDialogFooter,
	AppDialogTitle,
	AppDialogDescription,
};
