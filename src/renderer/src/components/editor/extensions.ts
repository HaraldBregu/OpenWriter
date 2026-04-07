import type { AnyExtension } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import Paragraph from '@tiptap/extension-paragraph';
import Heading from '@tiptap/extension-heading';
import { HistoryKeyboardExtension } from './extensions/history-keyboard-extension';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import { ListKeymap } from '@tiptap/extension-list';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import { Placeholder } from '@tiptap/extensions';
import { SearchExtension } from './extensions/search-extension';
import { SelectionMarkerExtension } from './extensions/selection-marker-extension';
import { AssistantExtension } from './extensions/assistant';
import { ImageExtension, type ImageInsertHandler } from './extensions/image';
import { ImagePlaceholderExtension } from './extensions/image_placeholder';
import { Markdown } from '@tiptap/markdown';

export interface ExtensionHandlers {
	onGenerateTextSubmit: (before: string, after: string, cursorPos: number, prompt: string) => void;
	onGenerateImageSubmit: (
		before: string,
		after: string,
		cursorPos: number,
		prompt: string,
		files: File[]
	) => void;
	onImageInsert: ImageInsertHandler;
	onUndo: () => void;
	onRedo: () => void;
}

export function createExtensions(handlers: ExtensionHandlers): AnyExtension[] {
	return [
		Document,
		Text,
		Paragraph,
		Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
		HistoryKeyboardExtension.configure({ onUndo: handlers.onUndo, onRedo: handlers.onRedo }),
		Bold,
		Italic,
		Underline,
		Strike,
		HorizontalRule,
		BulletList,
		OrderedList,
		ListItem,
		ListKeymap,
		Dropcursor,
		Gapcursor,
		ImageExtension.configure({ onImageInsert: handlers.onImageInsert }),
		ImagePlaceholderExtension.configure({ onImageInsert: handlers.onImageInsert }),
		SearchExtension,
		SelectionMarkerExtension,
		AssistantExtension.configure({
			onGenerateTextSubmit: handlers.onGenerateTextSubmit,
			onGenerateImageSubmit: handlers.onGenerateImageSubmit,
		}),
		Markdown,
		Placeholder.configure({
			placeholder: ({ node }) => {
				if (node.type.name === 'paragraph') {
					return 'Type `space` for assistance and `/` for commands';
				}
				if (node.type.name === 'heading') {
					return `Heading ${node.attrs.level}`;
				}
				return '';
			},
		}),
	];
}
