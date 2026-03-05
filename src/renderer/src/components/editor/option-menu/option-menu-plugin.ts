import { posToDOMRect } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import { type EditorState, Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { computePosition, offset, shift, flip } from '@floating-ui/dom';

export interface OptionMenuPluginProps {
	pluginKey: PluginKey | string;
	editor: Editor;
	element: HTMLElement;
	onShow: () => void;
	onHide: () => void;
	onQueryChange: (query: string, slashPos: number) => void;
	onKeyEvent: (event: KeyboardEvent) => boolean;
}

export class OptionMenuView {
	public editor: Editor;
	public element: HTMLElement;
	public view: EditorView;

	private visible = false;
	private dismissed = false;
	private dismissedSlashPos: number | null = null;
	private slashPos: number | null = null;
	private onShow: () => void;
	private onHide: () => void;
	private onQueryChange: (query: string, slashPos: number) => void;

	constructor(view: EditorView, props: OptionMenuPluginProps) {
		this.editor = props.editor;
		this.element = props.element;
		this.view = view;
		this.onShow = props.onShow;
		this.onHide = props.onHide;
		this.onQueryChange = props.onQueryChange;

		this.element.style.visibility = 'hidden';
		this.element.style.position = 'absolute';
	}

	update(view: EditorView, _oldState?: EditorState): void {
		this.view = view;
		const { state } = view;
		const { selection } = state;

		// Only work with cursor selections (not ranges)
		if (!selection.empty) {
			this.hide();
			return;
		}

		const $from = selection.$from;
		const cursorPos = $from.pos;

		// Get the start of the current text block
		const blockStart = $from.start();
		const textBefore = state.doc.textBetween(blockStart, cursorPos, '\0', '\0');

		// Find the last "/" that is either at the start of the block or preceded by whitespace
		let slashIndex = -1;
		for (let i = textBefore.length - 1; i >= 0; i--) {
			if (textBefore[i] === '/') {
				if (i === 0 || /\s/.test(textBefore[i - 1])) {
					slashIndex = i;
					break;
				}
			}
		}

		if (slashIndex === -1) {
			this.hide();
			this.dismissed = false;
			this.dismissedSlashPos = null;
			return;
		}

		const foundSlashPos = blockStart + slashIndex;

		// If user dismissed this exact slash, don't re-show
		if (this.dismissed && this.dismissedSlashPos === foundSlashPos) {
			return;
		}

		// A new slash position means a new trigger — reset dismissed
		if (this.dismissedSlashPos !== foundSlashPos) {
			this.dismissed = false;
			this.dismissedSlashPos = null;
		}

		const query = textBefore.slice(slashIndex + 1);
		this.slashPos = foundSlashPos;

		this.onQueryChange(query, this.slashPos);
		void this.updatePosition();
		this.show();
	}

	async updatePosition(): Promise<void> {
		if (this.slashPos === null) return;

		const slashPos = this.slashPos;
		const virtualEl = {
			getBoundingClientRect: () => posToDOMRect(this.view, slashPos, slashPos + 1),
		};

		const pos = await computePosition(virtualEl, this.element, {
			placement: 'bottom-start',
			middleware: [offset(4), flip(), shift({ padding: 8 })],
		});

		this.element.style.left = `${pos.x}px`;
		this.element.style.top = `${pos.y}px`;
	}

	show(): void {
		if (!this.visible) {
			this.visible = true;
			this.element.style.visibility = 'visible';
			this.onShow();
		}
	}

	hide(): void {
		if (this.visible) {
			this.visible = false;
			this.slashPos = null;
			this.element.style.visibility = 'hidden';
			this.onHide();
		}
	}

	dismiss(): void {
		this.dismissed = true;
		this.dismissedSlashPos = this.slashPos;
		this.hide();
	}

	isVisible(): boolean {
		return this.visible;
	}

	getSlashPos(): number | null {
		return this.slashPos;
	}

	destroy(): void {
		this.hide();
	}
}

export const OptionMenuPlugin = (options: OptionMenuPluginProps): Plugin => {
	const key =
		typeof options.pluginKey === 'string' ? new PluginKey(options.pluginKey) : options.pluginKey;

	let menuView: OptionMenuView | null = null;

	return new Plugin({
		key,
		view: (view) => {
			menuView = new OptionMenuView(view, options);
			return menuView;
		},
		props: {
			handleKeyDown(_view, event) {
				if (!menuView?.isVisible()) return false;

				if (event.key === 'Escape') {
					menuView.dismiss();
					return true;
				}

				if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'Enter') {
					return options.onKeyEvent(event);
				}

				return false;
			},
		},
	});
};
