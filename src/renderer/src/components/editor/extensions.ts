import type { AnyExtension } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import Paragraph from '@tiptap/extension-paragraph';
import Heading from '@tiptap/extension-heading';
import History from '@tiptap/extension-history';
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
import { ContentGeneratorExtension } from './extensions/content_generator';
import { ImageExtension } from './extensions/image';
import { Markdown } from '@tiptap/markdown';

export interface ExtensionHandlers {
	onTextSubmit: (before: string, after: string, cursorPos: number, prompt: string) => void;
	onImageSubmit: (prompt: string) => void;
	onImageFileSelect: (file: File) => void;
}

export function createExtensions(handlers: ExtensionHandlers): AnyExtension[] {
	return [
		Document,
		Text,
		Paragraph,
		Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
		History,
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
		ImageExtension,
		SearchExtension,
		ContentGeneratorExtension.configure({
			onTextSubmit: handlers.onTextSubmit,
			onImageSubmit: handlers.onImageSubmit,
			onFileSelect: handlers.onImageFileSelect,
		}),
		Markdown,
		Placeholder.configure({
			placeholder: ({ node }) => {
				if (node.type.name === 'paragraph') {
					return "Type '/' for commands, or press 'space' for AI assistance\u2026";
				}
				if (node.type.name === 'heading') {
					return `Heading ${node.attrs.level}`;
				}
				return '';
			},
		}),
	];
}
