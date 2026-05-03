import * as React from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/Separator';

function ItemRowGroup({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			role="list"
			data-slot="item-row-group"
			className={cn(
				'group/item-row-group flex w-full flex-col gap-4 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2',
				className
			)}
			{...props}
		/>
	);
}

function ItemRowSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
	return (
		<Separator
			data-slot="item-row-separator"
			orientation="horizontal"
			className={cn('my-2', className)}
			{...props}
		/>
	);
}

const itemRowVariants = cva(
	'group/item-row flex w-full flex-wrap items-center rounded-lg border text-sm transition-colors duration-100 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [a]:transition-colors [a]:hover:bg-muted',
	{
		variants: {
			variant: {
				default: 'border-transparent',
				outline: 'border-border',
				muted: 'border-transparent bg-muted/50',
				'bottom-bordered': 'rounded-none border-transparent border-b-border',
			},
			size: {
				default: 'gap-2.5 px-3 py-2.5',
				sm: 'gap-2.5 px-3 py-2.5',
				xs: 'gap-2 px-2.5 py-2 in-data-[slot=dropdown-menu-content]:p-0',
				none: 'gap-2.5 px-0 py-2',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	}
);

function ItemRow({
	className,
	variant = 'default',
	size = 'default',
	render,
	...props
}: useRender.ComponentProps<'div'> & VariantProps<typeof itemRowVariants>) {
	return useRender({
		defaultTagName: 'div',
		props: mergeProps<'div'>(
			{
				className: cn(itemRowVariants({ variant, size, className })),
			},
			props
		),
		render,
		state: {
			slot: 'item-row',
			variant,
			size,
		},
	});
}

const itemRowMediaVariants = cva(
	'flex shrink-0 items-center justify-center gap-2 group-has-data-[slot=item-row-description]/item-row:translate-y-0.5 group-has-data-[slot=item-row-description]/item-row:self-start [&_svg]:pointer-events-none',
	{
		variants: {
			variant: {
				default: 'bg-transparent',
				icon: "[&_svg:not([class*='size-'])]:size-4",
				image:
					'size-10 overflow-hidden rounded-sm group-data-[size=sm]/item-row:size-8 group-data-[size=xs]/item-row:size-6 [&_img]:size-full [&_img]:object-cover',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	}
);

function ItemRowMedia({
	className,
	variant = 'default',
	...props
}: React.ComponentProps<'div'> & VariantProps<typeof itemRowMediaVariants>) {
	return (
		<div
			data-slot="item-row-media"
			data-variant={variant}
			className={cn(itemRowMediaVariants({ variant, className }))}
			{...props}
		/>
	);
}

function ItemRowContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="item-row-content"
			className={cn(
				'flex flex-1 flex-col gap-1 group-data-[size=xs]/item-row:gap-0 [&+[data-slot=item-row-content]]:flex-none',
				className
			)}
			{...props}
		/>
	);
}

function ItemRowTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="item-row-title"
			className={cn(
				'cn-font-heading line-clamp-1 flex w-fit items-center gap-2 text-sm leading-snug font-medium underline-offset-4',
				className
			)}
			{...props}
		/>
	);
}

function ItemRowDescription({ className, ...props }: React.ComponentProps<'p'>) {
	return (
		<p
			data-slot="item-row-description"
			className={cn(
				'line-clamp-2 text-left text-sm leading-normal font-normal text-muted-foreground group-data-[size=xs]/item-row:text-xs [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
				className
			)}
			{...props}
		/>
	);
}

function ItemRowActions({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="item-row-actions"
			className={cn('flex items-center gap-2', className)}
			{...props}
		/>
	);
}

function ItemRowHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="item-row-header"
			className={cn('flex basis-full items-center justify-between gap-2', className)}
			{...props}
		/>
	);
}

function ItemRowFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="item-row-footer"
			className={cn('flex basis-full items-center justify-between gap-2', className)}
			{...props}
		/>
	);
}

export {
	ItemRow,
	ItemRowMedia,
	ItemRowContent,
	ItemRowActions,
	ItemRowGroup,
	ItemRowSeparator,
	ItemRowTitle,
	ItemRowDescription,
	ItemRowHeader,
	ItemRowFooter,
};
