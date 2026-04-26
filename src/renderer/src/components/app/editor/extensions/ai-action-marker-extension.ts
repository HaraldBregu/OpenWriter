import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

interface AiActionMarkerRange {
	from: number;
	to: number;
}

interface AiActionMarkerPluginState {
	range: AiActionMarkerRange | null;
	deco: DecorationSet;
}

interface AiActionMarkerMeta {
	range: AiActionMarkerRange | null;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		aiActionMarker: {
			setAiActionMarker: (range: AiActionMarkerRange) => ReturnType;
			clearAiActionMarker: () => ReturnType;
		};
	}
}

export const aiActionMarkerPluginKey = new PluginKey<AiActionMarkerPluginState>(
	'aiActionMarker'
);

function createDecorations(
	doc: ProseMirrorNode,
	range: AiActionMarkerRange | null
): DecorationSet {
	if (!range) return DecorationSet.empty;
	return DecorationSet.create(doc, [
		Decoration.inline(
			range.from,
			range.to,
			{
				class:
					'bg-[linear-gradient(to_right,#ff4d4d,#7c3aed,#00c2ff,#7c3aed,#ff4d4d)] bg-[length:200%_100%] bg-clip-text text-transparent animate-ai-action-marker-flow',
			},
			{ inclusiveStart: true, inclusiveEnd: true }
		),
	]);
}

export const AiActionMarkerExtension = Extension.create({
	name: 'aiActionMarker',

	addCommands() {
		return {
			setAiActionMarker:
				(range: AiActionMarkerRange) =>
				({ tr, dispatch }) => {
					if (range.from >= range.to) return false;
					if (dispatch) {
						tr.setMeta(aiActionMarkerPluginKey, { range } satisfies AiActionMarkerMeta);
					}
					return true;
				},
			clearAiActionMarker:
				() =>
				({ tr, dispatch }) => {
					if (dispatch) {
						tr.setMeta(aiActionMarkerPluginKey, { range: null } satisfies AiActionMarkerMeta);
					}
					return true;
				},
		};
	},

	addProseMirrorPlugins() {
		return [
			new Plugin<AiActionMarkerPluginState>({
				key: aiActionMarkerPluginKey,

				state: {
					init: () => ({ range: null, deco: DecorationSet.empty }),
					apply: (tr, pluginState, _oldState, newState) => {
						const meta = tr.getMeta(aiActionMarkerPluginKey) as
							| AiActionMarkerMeta
							| undefined;
						if (meta !== undefined) {
							return {
								range: meta.range,
								deco: createDecorations(newState.doc, meta.range),
							};
						}
						if (pluginState.range && tr.docChanged) {
							const from = tr.mapping.map(pluginState.range.from);
							const to = tr.mapping.map(pluginState.range.to);
							const range = from < to ? { from, to } : null;
							return {
								range,
								deco: createDecorations(newState.doc, range),
							};
						}
						return pluginState;
					},
				},

				props: {
					decorations(state) {
						return aiActionMarkerPluginKey.getState(state)?.deco ?? null;
					},
				},
			}),
		];
	},
});
