import { Node } from '@tiptap/core';
import type { PromptSubmitPayload } from '../types';
export interface PromptOptions {
    onPromptSubmit: (payload: PromptSubmitPayload) => void;
}
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        contentGenerator: {
            insertPromptView: () => ReturnType;
            removePromptView: () => ReturnType;
            setPromptViewState: (state: {
                loading?: boolean;
                enable?: boolean;
            }) => ReturnType;
        };
    }
}
export declare const PromptExtension: Node<PromptOptions, any>;
