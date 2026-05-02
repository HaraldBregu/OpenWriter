import React from 'react';
import type { NodeViewProps } from '@tiptap/react';
interface ProviderProps {
    nodeViewProps: NodeViewProps;
    children: React.ReactNode;
}
export declare function Provider({ nodeViewProps, children }: ProviderProps): React.JSX.Element;
export {};
