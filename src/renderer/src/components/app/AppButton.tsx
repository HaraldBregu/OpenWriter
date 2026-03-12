import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
	'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground hover:bg-primary/90',
				destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
				outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
				secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
				ghost: 'hover:bg-accent hover:text-accent-foreground',
				link: 'text-primary underline-offset-4 hover:underline',
				'editor-block-actions':
					'text-muted-foreground/50 transition-all duration-100 hover:bg-muted hover:text-muted-foreground active:scale-90',
				'prompt-submit': 'bg-blue-500 text-white hover:bg-blue-600',
			},
			size: {
				default: 'h-10 rounded-full px-4 py-2 [&_svg]:size-4',
				sm: 'h-9 rounded-full px-3 [&_svg]:size-4',
				lg: 'h-11 rounded-full px-8 [&_svg]:size-4',
				'icon-lg': 'h-10 w-10 rounded-full p-0 [&_svg]:size-5',
				icon: 'h-8 w-8 rounded-full p-0 [&_svg]:size-4',
				'icon-xs': 'h-6 w-6 rounded p-0 [&_svg]:h-4 [&_svg]:w-4',
				'editor-block-icons': 'h-6 w-6 rounded p-2 [&_svg]:h-[18px] [&_svg]:w-[18px]',
				'editor-block-icons-sm': 'h-5 w-5 rounded p-2 [&_svg]:h-[16px] [&_svg]:w-[16px]',
				'prompt-icon': 'h-6 w-6 rounded-full p-0 [&_svg]:size-3.5',
				'prompt-icon-sm': 'h-5 w-5 rounded-full p-0 [&_svg]:h-[16px] [&_svg]:w-[16px]',
				'prompt-submit-md': 'h-5 w-5 p-0 [&_svg]:h-[16px] [&_svg]:w-[16px]',
				'prompt-submit-sm': 'h-5 w-5 p-0 [&_svg]:h-[16px] [&_svg]:w-[16px]',
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
}

const AppButton = React.memo(
	React.forwardRef<HTMLButtonElement, ButtonProps>(
		({ className, variant, size, asChild = false, ...props }, ref) => {
			const Comp = asChild ? Slot : 'button';
			return (
				<Comp
					ref={ref}
					className={cn(
						buttonVariants({ variant, size }),
						'transition-colors focus-visible:ring-ring',
						className
					)}
					{...props}
				/>
			);
		}
	)
);
AppButton.displayName = 'AppButton';

export { AppButton, buttonVariants };
export type { ButtonProps };
