import React from 'react';
import type { ImageEntry } from '../../../../../../shared/types';
export interface ImagesMenuProps {
    open: boolean;
    anchor: HTMLElement | null;
    images: ImageEntry[];
    selectedIndex: number;
    onSelectIndex: (index: number) => void;
    onPick: (image: ImageEntry) => void;
    onMouseEnter?: () => void;
}
export declare function ImagesMenu({ open, anchor, images, selectedIndex, onSelectIndex, onPick, onMouseEnter, }: ImagesMenuProps): React.JSX.Element | null;
