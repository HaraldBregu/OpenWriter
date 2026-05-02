import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { DecorationSet } from '@tiptap/pm/view';
interface SelectionMarkerPluginState {
    focused: boolean;
    deco: DecorationSet;
}
export declare const selectionMarkerPluginKey: PluginKey<SelectionMarkerPluginState>;
export declare const SelectionMarkerExtension: Extension<any, any>;
export {};
