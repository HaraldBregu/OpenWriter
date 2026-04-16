import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { BubbleMenuPlugin, type BubbleMenuPluginProps } from './bubble-menu-plugin';

export type BubbleMenuExtensionOptions = Omit<BubbleMenuPluginProps, 'editor' | 'element'> & {
	element: HTMLElement | null;
};

export const BubbleMenuExtension = Extension.create<BubbleMenuExtensionOptions>({
	name: 'bubbleMenu',

	addOptions() {
		return {
			element: null,
			pluginKey: 'bubbleMenu',
			updateDelay: 250,
			shouldShow: null,
		};
	},

	addProseMirrorPlugins() {
		if (!this.options.element) {
			return [];
		}

		return [
			BubbleMenuPlugin({
				pluginKey:
					this.options.pluginKey instanceof PluginKey
						? this.options.pluginKey
						: new PluginKey(this.options.pluginKey),
				editor: this.editor,
				element: this.options.element,
				updateDelay: this.options.updateDelay,
				shouldShow: this.options.shouldShow,
			}),
		];
	},
});
