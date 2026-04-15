import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { MenuItem } from './menu-items';
import { getIconClass } from './styles';

interface OptionMenuItemProps {
	item: MenuItem;
	isSelected: boolean;
	onMouseEnter: () => void;
	onSelect: () => void;
}

export function OptionMenuItem({
	item,
	isSelected,
	onMouseEnter,
	onSelect,
}: OptionMenuItemProps): React.JSX.Element {
	const tone = item.tone ?? 'default';

	return (
		<Button
			variant={isSelected ? 'secondary' : 'ghost'}
			onMouseEnter={onMouseEnter}
			onMouseDown={(e) => {
				e.preventDefault();
				onSelect();
			}}
		>
			<span
				className={cn(
					'flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors',
					getIconClass(tone, isSelected)
				)}
			>
			</span>
			<span className="truncate">{item.label}</span>
		</Button>
	);
}
