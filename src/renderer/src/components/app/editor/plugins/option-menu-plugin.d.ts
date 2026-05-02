import type { Editor } from '@tiptap/core';
import { type EditorState, Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
export interface OptionMenuControls {
    forceHide: () => void;
    dismiss: () => void;
}
export interface OptionMenuState {
    open: boolean;
    getReferenceRect: (() => DOMRect) | null;
    query: string;
    slashPos: number | null;
}
export interface OptionMenuPluginProps {
    pluginKey: PluginKey | string;
    editor: Editor;
    onUpdate: (state: OptionMenuState) => void;
    onKeyEvent: (event: KeyboardEvent) => boolean;
    getIsLocked?: () => boolean;
    controls?: OptionMenuControls;
}
export declare class OptionMenuView {
    editor: Editor;
    view: EditorView;
    private visible;
    private dismissed;
    private dismissedSlashPos;
    private slashPos;
    private query;
    private onUpdate;
    private getIsLocked;
    constructor(view: EditorView, props: OptionMenuPluginProps);
    update(view: EditorView, _oldState?: EditorState): void;
    private getReferenceRect;
    private emitOpen;
    private emitClosed;
    show(): void;
    hide(): void;
    forceHide(): void;
    dismiss(): void;
    isVisible(): boolean;
    destroy(): void;
}
export declare const OptionMenuPlugin: (options: OptionMenuPluginProps) => Plugin;
