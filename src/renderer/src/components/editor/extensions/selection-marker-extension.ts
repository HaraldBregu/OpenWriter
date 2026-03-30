import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection, type Selection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

interface SelectionMarkerRange {
	from: number;
	to: number;
}

interface SelectionMarkerPluginState {
	focused: boolean;
	deco: DecorationSet;
}

interface SelectionMarkerMeta {
	focused: boolean;
}

export const selectionMarkerPluginKey = new PluginKey<SelectionMarkerPluginState>(
	'selectionMarker'
);

function getTextSelectionRange(selection: Selection): SelectionMarkerRange | null {
	if (!(selection instanceof TextSelection) || selection.empty) {
		return null;
	}

	return {
		from: selection.from,
		to: selection.to,
	};
}

function createDecorations(
	doc: ProseMirrorNode,
	range: SelectionMarkerRange | null,
	focused: boolean
): DecorationSet {
	if (focused || !range) {
		return DecorationSet.empty;
	}

	return DecorationSet.create(doc, [
		Decoration.inline(
			range.from,
			range.to,
			{ class: 'selection-marker' },
			{
				inclusiveStart: true,
				inclusiveEnd: true,
			}
		),
	]);
}

export const SelectionMarkerExtension = Extension.create({
	name: 'selectionMarker',

	addProseMirrorPlugins() {
		return [
			new Plugin<SelectionMarkerPluginState>({
				key: selectionMarkerPluginKey,

				state: {
					init: (_, state) => ({
						focused: false,
						deco: createDecorations(state.doc, getTextSelectionRange(state.selection), false),
					}),
					apply: (tr, pluginState, _oldState, newState) => {
						const meta = tr.getMeta(selectionMarkerPluginKey) as SelectionMarkerMeta | undefined;
						const focused = meta?.focused ?? pluginState.focused;
						const range = getTextSelectionRange(newState.selection);

						return {
							focused,
							deco: createDecorations(newState.doc, range, focused),
						};
					},
				},

				props: {
					handleDOMEvents: {
						focus: (view) => {
							view.dispatch(
								view.state.tr.setMeta(selectionMarkerPluginKey, { focused: true })
							);
							return false;
						},
						blur: (view) => {
							view.dispatch(
								view.state.tr.setMeta(selectionMarkerPluginKey, { focused: false })
							);
							return false;
						},
					},
					decorations(state) {
						return selectionMarkerPluginKey.getState(state)?.deco ?? null;
					},
				},
			}),
		];
	},
});
