import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { BubbleMenuPlugin, type BubbleMenuPluginProps } from '../plugins/bubble-menu-plugin';

export type BubbleMenuExtensionOptions = Omit<BubbleMenuPluginProps, 'editor'>;

export const BubbleMenuExtension = Extension.create<BubbleMenuExtensionOptions>({
	name: 'bubbleMenu',

	addOptions() {
		return {
			pluginKey: 'bubbleMenu',
			updateDelay: 250,
			shouldShow: null,
			onUpdate: () => {},
		};
	},

	addProseMirrorPlugins() {
		return [
			BubbleMenuPlugin({
				pluginKey:
					this.options.pluginKey instanceof PluginKey
						? this.options.pluginKey
						: new PluginKey(this.options.pluginKey),
				editor: this.editor,
				updateDelay: this.options.updateDelay,
				shouldShow: this.options.shouldShow,
				onUpdate: this.options.onUpdate,
			}),
		];
	},
});
