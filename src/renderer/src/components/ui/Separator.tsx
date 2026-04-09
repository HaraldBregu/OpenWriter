'use client';

import * as React from 'react';
import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';

import { cn } from '@/lib/utils';

interface SeparatorProps extends Omit<SeparatorPrimitive.Props, 'children'> {
	decorative?: boolean;
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
	({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
		<SeparatorPrimitive
			ref={ref}
			orientation={orientation}
			className={cn(
				'shrink-0 bg-border',
				orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
				className
			)}
			{...(decorative ? { role: 'none' } : {})}
			{...props}
		/>
	)
);
Separator.displayName = 'Separator';

export { Separator };
export type { SeparatorProps };
