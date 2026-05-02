import type { Editor } from '@tiptap/core';
import { type EditorState, Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
export type BubbleMenuShouldShow = (props: {
    editor: Editor;
    view: EditorView;
    state: EditorState;
    oldState?: EditorState;
    from: number;
    to: number;
}) => boolean;
export interface BubbleMenuPluginProps {
    pluginKey: PluginKey | string;
    editor: Editor;
    updateDelay?: number;
    shouldShow?: BubbleMenuShouldShow | null;
    onUpdate: (state: {
        open: boolean;
        getReferenceRect: (() => DOMRect) | null;
    }) => void;
}
export type BubbleMenuViewProps = BubbleMenuPluginProps & {
    view: EditorView;
};
export declare class BubbleMenuView {
    editor: Editor;
    view: EditorView;
    updateDelay: number;
    private updateDebounceTimer;
    private shouldShow;
    private onUpdate;
    constructor({ editor, view, updateDelay, shouldShow, onUpdate }: BubbleMenuViewProps);
    dragstartHandler: () => void;
    focusHandler: () => void;
    blurHandler: () => void;
    private getReferenceRect;
    private emitOpen;
    private emitClosed;
    update(view: EditorView, oldState?: EditorState): void;
    private handleDebouncedUpdate;
    private runUpdate;
    destroy(): void;
}
export declare const BubbleMenuPlugin: (options: BubbleMenuPluginProps) => Plugin;
