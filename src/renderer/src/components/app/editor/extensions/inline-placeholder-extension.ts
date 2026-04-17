import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const pluginKey = new PluginKey('inlinePlaceholder');

const InlinePlaceholder = Extension.create({
	name: 'inlinePlaceholder',

	addOptions() {
		return {
			placeholder: 'Keep writing…',
		};
	},

	addProseMirrorPlugins() {
		const { placeholder } = this.options;

		return [
			new Plugin({
				key: pluginKey,

				// Track focus state in plugin state
				state: {
					init: () => ({ focused: false }),
					apply(tr, pluginState) {
						const meta = tr.getMeta(pluginKey);
						if (meta !== undefined) return { focused: meta.focused };
						return pluginState;
					},
				},

				props: {
					// Update focus state on focus/blur events
					handleDOMEvents: {
						focus(view) {
							view.dispatch(view.state.tr.setMeta(pluginKey, { focused: true }));
							return false;
						},
						blur(view) {
							view.dispatch(view.state.tr.setMeta(pluginKey, { focused: false }));
							return false;
						},
					},

					decorations(state) {
						const pluginState = this.getState(state);
						if (!pluginState?.focused) return DecorationSet.empty;

						const { doc, selection } = state;

						if (!(selection instanceof TextSelection)) return DecorationSet.empty;

						const $cursor = selection.$cursor;
						if (!$cursor) return DecorationSet.empty;

						if ($cursor.parent.content.size === 0) return DecorationSet.empty;

						const isAtEnd = $cursor.pos === $cursor.end();
						if (!isAtEnd) return DecorationSet.empty;

						const widget = Decoration.widget(
							$cursor.pos,
							() => {
								const span = document.createElement('span');
								span.className = 'text-muted-foreground/55 italic pointer-events-none select-none';
								span.textContent = ' ' + placeholder;
								span.setAttribute('contenteditable', 'false');
								return span;
							},
							{ side: 1 }
						);

						return DecorationSet.create(doc, [widget]);
					},
				},
			}),
		];
	},
});

export { InlinePlaceholder };
