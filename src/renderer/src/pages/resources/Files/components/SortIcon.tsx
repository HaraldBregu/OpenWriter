import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactElement } from 'react';
import type { ResourcesFilesSortDirection as SortDirection } from '../../../../../../shared/types';

interface SortIconProps {
	readonly active: boolean;
	readonly direction: SortDirection;
}

export function SortIcon({ active, direction }: SortIconProps): ReactElement {
	if (!active || direction === 'none')
		return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
	if (direction === 'asc') return <ArrowUp className="ml-1 inline h-3 w-3" />;
	return <ArrowDown className="ml-1 inline h-3 w-3" />;
}
