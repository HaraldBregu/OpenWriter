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
	session: number;
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

const AI_ACTION_MARKER_DURATION = 5000;

function createDecorations(
	doc: ProseMirrorNode,
	range: AiActionMarkerRange | null
): DecorationSet {
	if (!range) return DecorationSet.empty;
	return DecorationSet.create(doc, [
		Decoration.inline(
			range.from,
			range.to,
			{ class: 'ai-action-marker' },
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
		const editor = this.editor;
		return [
			new Plugin<AiActionMarkerPluginState>({
				key: aiActionMarkerPluginKey,

				state: {
					init: () => ({ range: null, session: 0, deco: DecorationSet.empty }),
					apply: (tr, pluginState, _oldState, newState) => {
						const meta = tr.getMeta(aiActionMarkerPluginKey) as
							| AiActionMarkerMeta
							| undefined;
						if (meta !== undefined) {
							return {
								range: meta.range,
								session: pluginState.session + 1,
								deco: createDecorations(newState.doc, meta.range),
							};
						}
						if (pluginState.range && tr.docChanged) {
							const from = tr.mapping.map(pluginState.range.from);
							const to = tr.mapping.map(pluginState.range.to);
							const range = from < to ? { from, to } : null;
							return {
								...pluginState,
								range,
								deco: createDecorations(newState.doc, range),
							};
						}
						return pluginState;
					},
				},

				view(view) {
					let timer: ReturnType<typeof setTimeout> | null = null;
					let lastSession = 0;
					let disabled = false;

					const clearTimer = (): void => {
						if (timer) {
							clearTimeout(timer);
							timer = null;
						}
					};

					const setEditorEditable = (editable: boolean): void => {
						queueMicrotask(() => {
							if (editor.isDestroyed) return;
							editor.setEditable(editable);
						});
					};

					const disableEditor = (): void => {
						if (disabled) return;
						disabled = true;
						setEditorEditable(false);
					};

					const enableEditor = (): void => {
						if (!disabled) return;
						disabled = false;
						setEditorEditable(true);
					};

					return {
						update: (currentView) => {
							const state = aiActionMarkerPluginKey.getState(currentView.state);
							if (!state) return;
							if (state.session === lastSession) return;
							lastSession = state.session;
							clearTimer();
							if (state.range) {
								disableEditor();
								timer = setTimeout(() => {
									timer = null;
									enableEditor();
									currentView.dispatch(
										currentView.state.tr.setMeta(aiActionMarkerPluginKey, {
											range: null,
										} satisfies AiActionMarkerMeta)
									);
								}, AI_ACTION_MARKER_DURATION);
							} else {
								enableEditor();
							}
						},
						destroy: () => {
							clearTimer();
							enableEditor();
						},
					};
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
