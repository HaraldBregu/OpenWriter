import * as React from 'react';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { Check, ChevronRight, Circle } from 'lucide-react';

import { cn } from '@/lib/utils';

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
	return <MenuPrimitive.Root {...props} />;
}

const DropdownMenuTrigger = MenuPrimitive.Trigger;

const DropdownMenuGroup = MenuPrimitive.Group;

const DropdownMenuPortal = MenuPrimitive.Portal;

const DropdownMenuSub = MenuPrimitive.SubmenuRoot;

const DropdownMenuRadioGroup = MenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
	React.ElementRef<typeof MenuPrimitive.SubmenuTrigger>,
	MenuPrimitive.SubmenuTrigger.Props & {
		inset?: boolean;
	}
>(({ className, inset, children, ...props }, ref) => (
	<MenuPrimitive.SubmenuTrigger
		ref={ref}
		className={cn(
			'flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[popup-open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
			inset && 'pl-8',
			className
		)}
		{...props}
	>
		{children}
		<ChevronRight className="ml-auto" />
	</MenuPrimitive.SubmenuTrigger>
));
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger';

const DropdownMenuSubContent = React.forwardRef<
	React.ElementRef<typeof MenuPrimitive.Popup>,
	MenuPrimitive.Popup.Props
>(({ className, ...props }, ref) => (
	<MenuPrimitive.Portal>
		<MenuPrimitive.Positioner>
			<MenuPrimitive.Popup
				ref={ref}
				className={cn(
					'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--transform-origin)',
					className
				)}
				{...props}
			/>
		</MenuPrimitive.Positioner>
	</MenuPrimitive.Portal>
));
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent';

const DropdownMenuContent = React.forwardRef<
	React.ElementRef<typeof MenuPrimitive.Popup>,
	MenuPrimitive.Popup.Props &
		Pick<MenuPrimitive.Positioner.Props, 'sideOffset' | 'side' | 'align' | 'alignOffset'>
>(({ className, sideOffset = 4, side, align, alignOffset, ...props }, ref) => (
	<MenuPrimitive.Portal>
		<MenuPrimitive.Positioner
			sideOffset={sideOffset}
			side={side}
			align={align}
			alignOffset={alignOffset}
		>
			<MenuPrimitive.Popup
				ref={ref}
				className={cn(
					'z-50 max-h-[var(--available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--transform-origin)',
					className
				)}
				{...props}
			/>
		</MenuPrimitive.Positioner>
	</MenuPrimitive.Portal>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

const DropdownMenuItem = React.forwardRef<
	React.ElementRef<typeof MenuPrimitive.Item>,
	MenuPrimitive.Item.Props & {
		inset?: boolean;
	}
>(({ className, inset, ...props }, ref) => (
	<MenuPrimitive.Item
		ref={ref}
		className={cn(
			'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
			inset && 'pl-8',
			className
		)}
		{...props}
	/>
));
DropdownMenuItem.displayName = 'DropdownMenuItem';

const DropdownMenuCheckboxItem = React.forwardRef<
	React.ElementRef<typeof MenuPrimitive.CheckboxItem>,
	MenuPrimitive.CheckboxItem.Props
>(({ className, children, ...props }, ref) => (
	<MenuPrimitive.CheckboxItem
		ref={ref}
		className={cn(
			'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
			className
		)}
		{...props}
	>
		<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			<MenuPrimitive.CheckboxItemIndicator>
				<Check className="h-4 w-4" />
			</MenuPrimitive.CheckboxItemIndicator>
		</span>
		{children}
	</MenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';

const DropdownMenuRadioItem = React.forwardRef<
	React.ElementRef<typeof MenuPrimitive.RadioItem>,
	MenuPrimitive.RadioItem.Props
>(({ className, children, ...props }, ref) => (
	<MenuPrimitive.RadioItem
		ref={ref}
		className={cn(
			'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
			className
		)}
		{...props}
	>
		<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			<MenuPrimitive.RadioItemIndicator>
				<Circle className="h-2 w-2 fill-current" />
			</MenuPrimitive.RadioItemIndicator>
		</span>
		{children}
	</MenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem';

const DropdownMenuLabel = React.forwardRef<
	React.ElementRef<typeof MenuPrimitive.GroupLabel>,
	MenuPrimitive.GroupLabel.Props & {
		inset?: boolean;
	}
>(({ className, inset, ...props }, ref) => (
	<MenuPrimitive.GroupLabel
		ref={ref}
		className={cn('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', className)}
		{...props}
	/>
));
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

const DropdownMenuSeparator = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn('-mx-1 my-1 h-px bg-muted', className)} {...props} />
));
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
	return (
		<span className={cn('ml-auto text-xs tracking-widest opacity-60', className)} {...props} />
	);
};
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

export {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuCheckboxItem,
	DropdownMenuRadioItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuGroup,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuRadioGroup,
};
