import { Extension } from '@tiptap/core';

export interface UndoRedoKeymapOptions {
	onUndo: () => void;
	onRedo: () => void;
}

export const UndoRedoKeymapExtension = Extension.create<UndoRedoKeymapOptions>({
	name: 'undoRedoKeymap',

	addOptions() {
		return {
			onUndo: () => {},
			onRedo: () => {},
		};
	},

	addKeyboardShortcuts() {
		return {
			'Mod-z': () => {
				this.options.onUndo();
				return true;
			},
			'Mod-Shift-z': () => {
				this.options.onRedo();
				return true;
			},
			'Mod-y': () => {
				this.options.onRedo();
				return true;
			},
		};
	},
});
