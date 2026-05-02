import React from 'react';
export interface InputMenuProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (prompt: string) => void;
    getReferenceRect: () => DOMRect;
    placeholder?: string;
}
export declare const InputMenu: React.NamedExoticComponent<InputMenuProps>;
