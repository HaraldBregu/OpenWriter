import type { AnyExtension } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import Paragraph from '@tiptap/extension-paragraph';
import Heading from '@tiptap/extension-heading';
import { HistoryKeyboardExtension } from './history-keyboard-extension';
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
import { SearchExtension } from './search-extension';
import { SelectionMarkerExtension } from './selection-marker-extension';
import { PromptExtension } from './prompt-extension';
import { ImageExtension } from './image-extension';
import type { ImageInsertHandler } from '../plugins/image-drop-paste-plugin';
import { Markdown } from '@tiptap/markdown';
import type { ModelInfo } from '../../../../../../shared/types';
import type { PromptSubmitPayload } from '@shared/index';
import { ImagePlaceholderExtension } from './image-placeholder-extension';

export interface ExtensionHandlers {
	onPromptSubmit: (payload: PromptSubmitPayload) => void;
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
		PromptExtension.configure({
			onPromptSubmit: handlers.onPromptSubmit,
		}),
		Markdown,
		Placeholder.configure({
			placeholder: ({ node }) => {
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
