import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		search: {
			setSearch: (query: string) => ReturnType;
			clearSearch: () => ReturnType;
		};
	}
}

const searchPluginKey = new PluginKey('search');

export const SearchExtension = Extension.create({
	name: 'search',

	addStorage() {
		return { query: '' };
	},

	addCommands() {
		const storage = this.storage;
		return {
			setSearch:
				(query: string) =>
				({ editor }) => {
					storage.query = query;
					// Force a decoration update by dispatching an empty transaction
					editor.view.dispatch(editor.state.tr);
					return true;
				},
			clearSearch:
				() =>
				({ editor }) => {
					editor.commands.setSearch('');
					return true;
				},
		};
	},

	addProseMirrorPlugins() {
		const editor = this.editor;

		return [
			new Plugin({
				key: searchPluginKey,
				props: {
					decorations(state) {
						const query = editor.storage.search?.query as string;

						if (!query || query.length === 0) return DecorationSet.empty;

						const decorations: Decoration[] = [];
						const { doc } = state;
						const searchText = query.toLowerCase();

						// Walk through every text node in the document
						doc.descendants((node, pos) => {
							if (!node.isText || !node.text) return;

							const text = node.text.toLowerCase();
							let index = 0;

							while ((index = text.indexOf(searchText, index)) !== -1) {
								const from = pos + index;
								const to = from + searchText.length;

								decorations.push(
									Decoration.inline(from, to, {
										class: 'bg-yellow-200 text-yellow-900 rounded',
									})
								);

								index += searchText.length;
							}
						});

						return DecorationSet.create(doc, decorations);
					},
				},
			}),
		];
	},
});
