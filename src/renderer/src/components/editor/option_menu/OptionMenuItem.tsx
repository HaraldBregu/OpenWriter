import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { MenuItem } from './menu-items';
import { getIconClass } from './styles';

interface OptionMenuItemProps {
	item: MenuItem;
	isSelected: boolean;
	showSpinner: boolean;
	onMouseEnter: () => void;
	onSelect: () => void;
}

export function OptionMenuItem({
	item,
	isSelected,
	showSpinner,
	onMouseEnter,
	onSelect,
}: OptionMenuItemProps): React.JSX.Element {
	const Icon = item.icon;
	const tone = item.tone ?? 'default';

	return (
		<Button
			variant={isSelected ? 'secondary' : 'ghost'}
			onMouseEnter={onMouseEnter}
			onMouseDown={(e) => {
				e.preventDefault();
				if (!showSpinner) onSelect();
			}}
			disabled={showSpinner}
		>
			<span
				className={cn(
					'flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors',
					getIconClass(tone, isSelected)
				)}
			>
				{showSpinner ? (
					<Loader2 className="h-4 w-4 shrink-0 animate-spin" />
				) : (
					<Icon className="h-4 w-4 shrink-0" />
				)}
			</span>
			<span className="truncate">{item.label}</span>
		</Button>
	);
}
