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
import CodeBlock from '@tiptap/extension-code-block';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import { ListKeymap } from '@tiptap/extension-list';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import { Placeholder } from '@tiptap/extensions';
import { SearchExtension } from './search-extension';
import { PromptExtension } from './prompt-extension';
import { ImageExtension } from './image-extension';
import type { ImageInsertHandler } from '../plugins/image-drop-paste-plugin';
import { Markdown } from '@tiptap/markdown';
import type { PromptSubmitPayload } from '@shared/index';
import { ImagePlaceholderExtension } from './image-placeholder-extension';

export interface ExtensionHandlers {
	onPromptSubmit: (payload: PromptSubmitPayload) => void;
	onImageInsert: ImageInsertHandler;
}

export function createExtensions(handlers: ExtensionHandlers): AnyExtension[] {
	return [
		Document,
		Text,
		Paragraph,
		Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
		History.configure({ depth: 100, newGroupDelay: 500 }),
		Bold,
		Italic,
		Underline,
		Strike,
		CodeBlock,
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
		PromptExtension.configure({
			onPromptSubmit: handlers.onPromptSubmit,
		}),
		Markdown.configure({
			markedOptions: { gfm: true },
		}),
		Placeholder.configure({
			placeholder: ({ editor, node }) => {
				if (!editor.isFocused) return '';
				if (node.type.name === 'paragraph') {
					return 'Type `space` for AI or `/` for commands';
				}
				if (node.type.name === 'heading') {
					return `Heading ${node.attrs.level}`;
				}
				return '';
			},
		}),
	];
}
