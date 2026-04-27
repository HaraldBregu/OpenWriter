import { posToDOMRect } from '@tiptap/core';
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

export class OptionMenuView {
	public editor: Editor;
	public view: EditorView;

	private visible = false;
	private dismissed = false;
	private dismissedSlashPos: number | null = null;
	private slashPos: number | null = null;
	private query = '';
	private onUpdate: (state: OptionMenuState) => void;
	private getIsLocked: () => boolean;

	constructor(view: EditorView, props: OptionMenuPluginProps) {
		this.editor = props.editor;
		this.view = view;
		this.onUpdate = props.onUpdate;
		this.getIsLocked = props.getIsLocked ?? (() => false);

		if (props.controls) {
			props.controls.forceHide = () => this.forceHide();
		}
	}

	update(view: EditorView, _oldState?: EditorState): void {
		this.view = view;
		const { state } = view;
		const { selection } = state;

		if (!selection.empty) {
			this.hide();
			return;
		}

		const $from = selection.$from;
		const cursorPos = $from.pos;
		const blockStart = $from.start();
		const textBefore = state.doc.textBetween(blockStart, cursorPos, '\0', '\0');

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

		if (this.dismissed && this.dismissedSlashPos === foundSlashPos) {
			return;
		}

		if (this.dismissedSlashPos !== foundSlashPos) {
			this.dismissed = false;
			this.dismissedSlashPos = null;
		}

		this.query = textBefore.slice(slashIndex + 1);
		this.slashPos = foundSlashPos;
		this.show();
	}

	private getReferenceRect = (): DOMRect => {
		const slashPos = this.slashPos ?? 0;
		return posToDOMRect(this.view, slashPos, slashPos + 1);
	};

	private emitOpen(): void {
		this.onUpdate({
			open: true,
			getReferenceRect: this.getReferenceRect,
			query: this.query,
			slashPos: this.slashPos,
		});
	}

	private emitClosed(): void {
		this.onUpdate({
			open: false,
			getReferenceRect: null,
			query: '',
			slashPos: null,
		});
	}

	show(): void {
		this.visible = true;
		this.emitOpen();
	}

	hide(): void {
		if (!this.visible) return;
		if (this.getIsLocked()) return;
		this.visible = false;
		this.slashPos = null;
		this.query = '';
		this.emitClosed();
	}

	forceHide(): void {
		if (!this.visible) return;
		this.visible = false;
		this.slashPos = null;
		this.query = '';
		this.emitClosed();
	}

	dismiss(): void {
		this.dismissed = true;
		this.dismissedSlashPos = this.slashPos;
		this.forceHide();
	}

	isVisible(): boolean {
		return this.visible;
	}

	destroy(): void {
		this.forceHide();
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

				if (
					event.key === 'ArrowUp' ||
					event.key === 'ArrowDown' ||
					event.key === 'ArrowLeft' ||
					event.key === 'ArrowRight' ||
					event.key === 'Enter'
				) {
					return options.onKeyEvent(event);
				}

				return false;
			},
		},
	});
};
