import React from 'react';
interface ToolbarButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
}
export declare function ToolbarButton({ icon, label, onClick, active, disabled, }: ToolbarButtonProps): React.JSX.Element;
export {};
