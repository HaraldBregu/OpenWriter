import React from 'react';
import { render } from '@testing-library/react';

const mockSetContent = jest.fn();
const mockSetEditable = jest.fn();
let mockMarkdown = '';

const mockEditor = {
	isDestroyed: false,
	storage: { image: {} },
	commands: {
		setContent: (...args: unknown[]) => mockSetContent(...args),
	},
	getMarkdown: () => mockMarkdown,
	setEditable: (...args: unknown[]) => mockSetEditable(...args),
};

jest.mock('@tiptap/react', () => ({
	useEditor: () => mockEditor,
	EditorContent: ({ editor }: { editor: unknown }) => (
		<div data-testid="editor-content">{String(!!editor)}</div>
	),
}));

jest.mock('../../../../src/renderer/src/components/editor/BlockControls', () => ({
	BlockControls: () => null,
	GUTTER_WIDTH: 0,
}));

jest.mock('../../../../src/renderer/src/components/editor/BlockActions', () => ({
	BlockActions: () => null,
}));

jest.mock('../../../../src/renderer/src/components/editor/bubble_menu', () => ({
	BubbleMenu: () => null,
}));

jest.mock('../../../../src/renderer/src/components/editor/option_menu', () => ({
	OptionMenu: () => null,
}));

jest.mock('../../../../src/renderer/src/components/editor/InsertImageDialog', () => ({
	InsertImageDialog: () => null,
}));

jest.mock('../../../../src/renderer/src/components/editor/extensions', () => ({
	createExtensions: () => [],
}));

jest.mock('../../../../src/renderer/src/components/editor/EditorContext', () => ({
	EditorProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../../../src/renderer/src/lib/utils', () => ({
	cn: (...values: Array<string | undefined | null | false>) => values.filter(Boolean).join(' '),
}));

import { TextEditor } from '../../../../src/renderer/src/components/editor/TextEditor';

describe('TextEditor', () => {
	beforeEach(() => {
		mockMarkdown = 'saved snapshot';
		mockSetContent.mockReset();
		mockSetEditable.mockReset();
	});

	it('forces an external content sync when the external value version changes', () => {
		const { rerender } = render(
			<TextEditor value="saved snapshot" onChange={jest.fn()} externalValueVersion={0} />
		);

		expect(mockSetContent).not.toHaveBeenCalled();

		mockMarkdown = 'unsynced local draft';

		rerender(<TextEditor value="saved snapshot" onChange={jest.fn()} externalValueVersion={1} />);

		expect(mockSetContent).toHaveBeenCalledTimes(1);
		expect(mockSetContent).toHaveBeenCalledWith(
			'saved snapshot',
			expect.objectContaining({
				emitUpdate: false,
				contentType: 'markdown',
			})
		);
	});
});
