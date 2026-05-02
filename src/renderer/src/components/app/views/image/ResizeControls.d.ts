import React from 'react';
interface ResizeControlsProps {
    currentWidth: number;
    currentHeight: number;
    onApply: (width: number, height: number) => void;
}
export declare function ResizeControls({ currentWidth, currentHeight, onApply, }: ResizeControlsProps): React.JSX.Element;
export {};
