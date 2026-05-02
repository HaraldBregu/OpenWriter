import { Extension } from '@tiptap/core';
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        search: {
            setSearch: (query: string) => ReturnType;
            clearSearch: () => ReturnType;
        };
    }
}
export declare const SearchExtension: Extension<any, any>;
