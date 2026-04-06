import React from 'react';
import { cn } from '@/lib/utils';
import { AppButton } from '@/components/app/AppButton';
import { AppTooltip, AppTooltipContent, AppTooltipTrigger } from '@/components/app/AppTooltip';

interface ToolbarButtonProps {
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
	active?: boolean;
	disabled?: boolean;
}

export function ToolbarButton({
	icon,
	label,
	onClick,
	active,
	disabled,
}: ToolbarButtonProps): React.JSX.Element {
	return (
		<AppTooltip>
			<AppTooltipTrigger asChild>
				<AppButton
					variant="ghost"
					size="icon-xs"
					aria-label={label}
					aria-pressed={active}
					onClick={onClick}
					disabled={disabled}
					className={cn(
						'h-6 w-6 text-muted-foreground transition-colors hover:text-foreground [&_svg]:h-3.5 [&_svg]:w-3.5',
						active && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
					)}
				>
					{icon}
				</AppButton>
			</AppTooltipTrigger>
			<AppTooltipContent side="top" sideOffset={4} className="px-2 py-1 text-xs">
				{label}
			</AppTooltipContent>
		</AppTooltip>
	);
}
