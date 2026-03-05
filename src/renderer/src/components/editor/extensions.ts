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
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import { ListKeymap } from '@tiptap/extension-list';
import { Placeholder } from '@tiptap/extensions';
// import { InlinePlaceholder } from './inline-placeholder';

export const BASE_EXTENSIONS: AnyExtension[] = [
	Document,
	Text,
	Paragraph,
	Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
	History,
	Bold,
	Italic,
	Underline,
	Strike,
	BulletList,
	OrderedList,
	ListItem,
	ListKeymap,
	// InlinePlaceholder.configure({
	// 	placeholder: 'thinking...',
	// }),
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
