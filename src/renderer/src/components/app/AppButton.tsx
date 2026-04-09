import * as React from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
	'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
				destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
				outline:
					'border border-input bg-background/85 text-foreground hover:bg-accent hover:text-accent-foreground',
				secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
				ghost: 'hover:bg-accent hover:text-accent-foreground',
				link: 'text-primary underline-offset-4 hover:underline',
				'editor-block-actions':
					'text-muted-foreground/50 transition-all duration-100 hover:bg-muted hover:text-muted-foreground active:scale-90',
				'prompt-submit':
					'bg-primary text-primary-foreground shadow-[0_10px_24px_hsl(var(--foreground)/0.18)] hover:bg-primary/90',
				'header-icon':
					'bg-transparent text-muted-foreground shadow-none hover:bg-accent hover:text-foreground aria-expanded:text-foreground',
			},
			size: {
				default: 'h-10 rounded-lg px-4 py-2 [&_svg]:size-4',
				sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
				lg: 'h-9 rounded-lg gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg]:h-[16px] [&_svg]:w-[16px]',
				'icon-lg': 'h-10 w-10 rounded-lg p-0 [&_svg]:size-5',
				icon: 'h-8 w-8 rounded-lg p-0 [&_svg]:size-4',
				'icon-xs': 'h-6 w-6 rounded-lg p-0 [&_svg]:h-4 [&_svg]:w-4',
				'editor-block-icons': 'h-6 w-6 rounded-lg p-2 [&_svg]:h-[18px] [&_svg]:w-[18px]',
				'editor-block-icons-sm': 'h-5 w-5 rounded-lg p-2 [&_svg]:h-[16px] [&_svg]:w-[16px]',
				'prompt-icon': 'h-6 w-6 rounded-lg p-0 [&_svg]:size-3.5',
				'prompt-icon-sm': 'h-5 w-5 rounded-lg p-0 [&_svg]:h-[16px] [&_svg]:w-[16px]',
				'prompt-submit-md': 'h-6 w-6 rounded-lg p-0 [&_svg]:h-[16px] [&_svg]:w-[16px]',
				'prompt-submit-sm': 'h-5 w-5 rounded-lg p-0 [&_svg]:h-[16px] [&_svg]:w-[16px]',
				'header-icon': 'h-11 w-11 rounded-lg p-0 [&_svg]:h-5 [&_svg]:w-5',
				'header-icon-sm': 'h-8 w-8 rounded-lg p-0 [&_svg]:h-4 [&_svg]:w-4',
				'header-icon-md': 'h-10 w-10 rounded-lg p-0 [&_svg]:h-5 [&_svg]:w-5',
				'header-icon-lg': 'h-12 w-12 rounded-lg p-0 [&_svg]:h-6 [&_svg]:w-6',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	}
);

interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
	asChild?: boolean;
	render?: useRender.ComponentProps<'button'>['render'];
}

const AppButton = React.memo(
	React.forwardRef<HTMLButtonElement, ButtonProps>(
		(
			{ className, variant, size, asChild = false, render: renderProp, children, ...props },
			ref
		) => {
			const resolvedRender = asChild && React.isValidElement(children) ? children : renderProp;

			if (resolvedRender) {
				return useRender({
					defaultTagName: 'button',
					props: {
						...mergeProps<'button'>(
							{
								className: cn(
									buttonVariants({ variant, size }),
									'transition-colors focus-visible:ring-ring',
									className
								),
								ref,
							},
							props
						),
						'data-slot': 'button',
					},
					render: resolvedRender,
					state: {},
				});
			}

			return (
				<button
					data-slot="button"
					ref={ref}
					className={cn(
						buttonVariants({ variant, size }),
						'transition-colors focus-visible:ring-ring',
						className
					)}
					{...props}
				>
					{children}
				</button>
			);
		}
	)
);
AppButton.displayName = 'AppButton';

export { AppButton, buttonVariants };
export type { ButtonProps };
