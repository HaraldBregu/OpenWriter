import { isTextSelection, posToDOMRect } from '@tiptap/core';
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
	onUpdate: (state: { open: boolean; getReferenceRect: (() => DOMRect) | null }) => void;
}

export type BubbleMenuViewProps = BubbleMenuPluginProps & { view: EditorView };

export class BubbleMenuView {
	public editor: Editor;
	public view: EditorView;
	public updateDelay: number;

	private updateDebounceTimer: ReturnType<typeof setTimeout> | undefined;
	private shouldShow: BubbleMenuShouldShow;
	private onUpdate: BubbleMenuPluginProps['onUpdate'];

	constructor({ editor, view, updateDelay = 250, shouldShow, onUpdate }: BubbleMenuViewProps) {
		this.editor = editor;
		this.view = view;
		this.updateDelay = updateDelay;
		this.onUpdate = onUpdate;

		this.view.dom.addEventListener('dragstart', this.dragstartHandler);
		this.editor.on('focus', this.focusHandler);
		this.editor.on('blur', this.blurHandler);

		this.shouldShow =
			shouldShow ??
			(({ view: v, state, from, to }) => {
				const { doc, selection } = state;
				const isEmptyTextBlock = !doc.textBetween(from, to).length && isTextSelection(selection);
				if (!v.hasFocus() || state.selection.empty || isEmptyTextBlock) return false;
				return true;
			});
	}

	dragstartHandler = (): void => {
		this.emitClosed();
	};

	focusHandler = (): void => {
		setTimeout(() => this.update(this.editor.view));
	};

	blurHandler = (): void => {
		this.emitClosed();
	};

	private getReferenceRect = (): DOMRect => {
		const { selection } = this.editor.state;
		if (isTextSelection(selection)) {
			const { ranges } = selection;
			const from = Math.min(...ranges.map((r) => r.$from.pos));
			const to = Math.max(...ranges.map((r) => r.$to.pos));
			return posToDOMRect(this.view, from, to);
		}
		const node = this.view.nodeDOM(selection.from) as HTMLElement | null;
		if (node) return node.getBoundingClientRect();
		return posToDOMRect(this.view, selection.from, selection.to);
	};

	private emitOpen(): void {
		this.onUpdate({ open: true, getReferenceRect: this.getReferenceRect });
	}

	private emitClosed(): void {
		this.onUpdate({ open: false, getReferenceRect: null });
	}

	update(view: EditorView, oldState?: EditorState): void {
		const { state } = view;
		const hasValidSelection = state.selection.from !== state.selection.to;

		if (this.updateDelay > 0 && hasValidSelection) {
			this.handleDebouncedUpdate(view, oldState);
			return;
		}

		const selectionChanged = !oldState?.selection.eq(view.state.selection);
		const docChanged = !oldState?.doc.eq(view.state.doc);
		this.runUpdate(view, selectionChanged, docChanged, oldState);
	}

	private handleDebouncedUpdate = (view: EditorView, oldState?: EditorState): void => {
		const selectionChanged = !oldState?.selection.eq(view.state.selection);
		const docChanged = !oldState?.doc.eq(view.state.doc);
		if (!selectionChanged && !docChanged) return;

		if (this.updateDebounceTimer) clearTimeout(this.updateDebounceTimer);
		this.updateDebounceTimer = setTimeout(() => {
			this.runUpdate(view, selectionChanged, docChanged, oldState);
		}, this.updateDelay);
	};

	private runUpdate = (
		view: EditorView,
		selectionChanged: boolean,
		docChanged: boolean,
		oldState?: EditorState
	): void => {
		const { state, composing } = view;
		const { selection } = state;
		const isSame = !selectionChanged && !docChanged;
		if (composing || isSame) return;

		const shouldShow = this.shouldShow({
			editor: this.editor,
			view,
			state,
			oldState,
			from: selection.from,
			to: selection.to,
		});

		if (!shouldShow) {
			this.emitClosed();
			return;
		}
		this.emitOpen();
	};

	destroy(): void {
		if (this.updateDebounceTimer) clearTimeout(this.updateDebounceTimer);
		this.view.dom.removeEventListener('dragstart', this.dragstartHandler);
		this.editor.off('focus', this.focusHandler);
		this.editor.off('blur', this.blurHandler);
	}
}

export const BubbleMenuPlugin = (options: BubbleMenuPluginProps): Plugin => {
	const key =
		typeof options.pluginKey === 'string' ? new PluginKey(options.pluginKey) : options.pluginKey;

	return new Plugin({
		key,
		view: (view) => new BubbleMenuView({ ...options, view }),
	});
};
