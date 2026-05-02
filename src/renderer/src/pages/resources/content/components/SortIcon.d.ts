import type { ReactElement } from 'react';
import type { SortDirection } from '../shared/types';
interface SortIconProps {
    readonly active: boolean;
    readonly direction: SortDirection;
}
export declare function SortIcon({ active, direction }: SortIconProps): ReactElement;
export {};
