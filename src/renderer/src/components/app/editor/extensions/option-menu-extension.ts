import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { OptionMenuPlugin, type OptionMenuPluginProps } from '../plugins/option-menu-plugin';

export type OptionMenuExtensionOptions = Omit<OptionMenuPluginProps, 'editor'>;

export const OptionMenuExtension = Extension.create<OptionMenuExtensionOptions>({
	name: 'optionMenu',

	addOptions() {
		return {
			pluginKey: 'optionMenu',
			onUpdate: () => {},
			onKeyEvent: () => false,
		};
	},

	addProseMirrorPlugins() {
		return [
			OptionMenuPlugin({
				pluginKey:
					this.options.pluginKey instanceof PluginKey
						? this.options.pluginKey
						: new PluginKey(this.options.pluginKey as string),
				editor: this.editor,
				onUpdate: this.options.onUpdate,
				onKeyEvent: this.options.onKeyEvent,
				getIsLocked: this.options.getIsLocked,
				controls: this.options.controls,
			}),
		];
	},
});
