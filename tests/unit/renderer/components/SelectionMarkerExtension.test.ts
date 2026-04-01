import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { Editor } from '@tiptap/core';
import {
	SelectionMarkerExtension,
	selectionMarkerPluginKey,
} from '../../../../src/renderer/src/components/editor/extensions/selection-marker-extension';

describe('SelectionMarkerExtension', () => {
	let host: HTMLDivElement;
	let editor: Editor;

	const getDecorations = () => selectionMarkerPluginKey.getState(editor.state)?.deco.find() ?? [];

	beforeEach(() => {
		host = document.createElement('div');
		document.body.appendChild(host);
		editor = new Editor({
			element: host,
			extensions: [Document, Paragraph, Text, SelectionMarkerExtension],
			content: '<p>Hello world</p>',
		});
	});

	afterEach(() => {
		editor.destroy();
		host.remove();
	});

	it('shows no custom selection marker while the editor is focused', () => {
		editor.commands.setTextSelection({ from: 1, to: 5 });
		editor.view.dispatch(editor.state.tr.setMeta(selectionMarkerPluginKey, { focused: true }));

		expect(getDecorations()).toHaveLength(0);
	});

	it('renders a selection marker when a text range exists and the editor is blurred', () => {
		editor.commands.setTextSelection({ from: 1, to: 5 });
		editor.view.dispatch(editor.state.tr.setMeta(selectionMarkerPluginKey, { focused: false }));

		const decorations = getDecorations();

		expect(decorations).toHaveLength(1);
		expect(decorations[0]?.from).toBe(1);
		expect(decorations[0]?.to).toBe(5);
		expect(decorations[0]?.type.attrs.class).toBe('selection-marker');
	});

	it('clears the selection marker when the selection collapses', () => {
		editor.commands.setTextSelection({ from: 1, to: 5 });
		editor.view.dispatch(editor.state.tr.setMeta(selectionMarkerPluginKey, { focused: false }));

		editor.commands.setTextSelection(5);
		editor.view.dispatch(editor.state.tr.setMeta(selectionMarkerPluginKey, { focused: false }));

		expect(getDecorations()).toHaveLength(0);
	});
});
