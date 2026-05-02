import React from 'react';
import type { ResourceInfo } from '../../../../../../shared/types';
export interface ContentsMenuProps {
    open: boolean;
    anchor: HTMLElement | null;
    contents: ResourceInfo[];
    selectedIndex: number;
    onSelectIndex: (index: number) => void;
    onPick: (content: ResourceInfo) => void;
    onMouseEnter?: () => void;
}
export declare function ContentsMenu({ open, anchor, contents, selectedIndex, onSelectIndex, onPick, onMouseEnter, }: ContentsMenuProps): React.JSX.Element | null;
