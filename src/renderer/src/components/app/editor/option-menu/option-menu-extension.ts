import { Extension } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import { OptionMenuPlugin, type OptionMenuPluginProps } from './option-menu-plugin'

export type OptionMenuExtensionOptions = Omit<OptionMenuPluginProps, 'editor' | 'element'> & {
  element: HTMLElement | null
}

export const OptionMenuExtension = Extension.create<OptionMenuExtensionOptions>({
  name: 'optionMenu',

  addOptions() {
    return {
      element: null,
      pluginKey: 'optionMenu',
      onShow: () => {},
      onHide: () => {},
      onQueryChange: () => {},
      onKeyEvent: () => false,
    }
  },

  addProseMirrorPlugins() {
    if (!this.options.element) {
      return []
    }

    return [
      OptionMenuPlugin({
        pluginKey:
          this.options.pluginKey instanceof PluginKey
            ? this.options.pluginKey
            : new PluginKey(this.options.pluginKey as string),
        editor: this.editor,
        element: this.options.element,
        onShow: this.options.onShow,
        onHide: this.options.onHide,
        onQueryChange: this.options.onQueryChange,
        onKeyEvent: this.options.onKeyEvent,
      }),
    ]
  },
})
