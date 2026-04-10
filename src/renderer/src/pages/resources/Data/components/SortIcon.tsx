import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactElement } from 'react';
import type { SortDirection } from '../types';

interface SortIconProps {
	readonly active: boolean;
	readonly direction: SortDirection;
}

export function SortIcon({ active, direction }: SortIconProps): ReactElement {
	if (!active || direction === 'none')
		return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 text-muted-foreground/50" />;
	if (direction === 'asc') return <ArrowUp className="ml-1 inline h-3.5 w-3.5" />;
	return <ArrowDown className="ml-1 inline h-3.5 w-3.5" />;
}
