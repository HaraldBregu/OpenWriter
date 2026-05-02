import React, { type ReactNode } from 'react';
interface ProviderProps {
    readonly children: ReactNode;
    readonly documentId: string | undefined;
}
export declare function Provider({ children, documentId }: ProviderProps): React.JSX.Element;
export {};
