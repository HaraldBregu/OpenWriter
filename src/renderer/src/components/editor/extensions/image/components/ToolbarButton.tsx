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
			<AppTooltipTrigger
				render={
					<AppButton
						variant="ghost"
						size="icon-xs"
						aria-label={label}
						aria-pressed={active}
						onClick={onClick}
						disabled={disabled}
						className={cn(
							'h-8 w-8 rounded-full text-muted-foreground transition-colors hover:text-foreground [&_svg]:h-4 [&_svg]:w-4',
							active && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
						)}
					>
						{icon}
					</AppButton>
				}
			/>
			<AppTooltipContent side="top" sideOffset={4} className="px-2 py-1 text-xs">
				{label}
			</AppTooltipContent>
		</AppTooltip>
	);
}
