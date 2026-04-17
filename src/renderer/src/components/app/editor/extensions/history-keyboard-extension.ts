import { Extension } from '@tiptap/core';

export interface HistoryKeyboardOptions {
	onUndo: (() => void) | null;
	onRedo: (() => void) | null;
}

export const HistoryKeyboardExtension = Extension.create<HistoryKeyboardOptions>({
	name: 'historyKeyboard',

	addOptions() {
		return {
			onUndo: null,
			onRedo: null,
		};
	},

	addKeyboardShortcuts() {
		return {
			'Mod-z': () => {
				this.options.onUndo?.();
				return true;
			},
			'Mod-Shift-z': () => {
				this.options.onRedo?.();
				return true;
			},
			'Mod-y': () => {
				this.options.onRedo?.();
				return true;
			},
		};
	},
});
