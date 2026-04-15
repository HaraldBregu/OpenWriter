import type React from 'react';
import type { Editor } from '@tiptap/core';
import { Heading, Type, List, ListOrdered, Minus } from 'lucide-react';

export interface MenuItem {
	label: string;
	icon: React.ElementType;
	command: (editor: Editor, slashPos: number, queryLength: number) => void;
	section?: 'ai';
	tone?: 'default' | 'ai';
}

export const MENU_ITEMS: MenuItem[] = [
	{
		label: 'Heading 1',
		icon: Heading,
		command: (editor, slashPos, queryLength) => {
			editor
				.chain()
				.focus()
				.deleteRange({ from: slashPos, to: slashPos + 1 + queryLength })
				.setHeading({ level: 1 })
				.run();
		},
	},
	{
		label: 'Heading 2',
		icon: Heading,
		command: (editor, slashPos, queryLength) => {
			editor
				.chain()
				.focus()
				.deleteRange({ from: slashPos, to: slashPos + 1 + queryLength })
				.setHeading({ level: 2 })
				.run();
		},
	},
	{
		label: 'Heading 3',
		icon: Heading,
		command: (editor, slashPos, queryLength) => {
			editor
				.chain()
				.focus()
				.deleteRange({ from: slashPos, to: slashPos + 1 + queryLength })
				.setHeading({ level: 3 })
				.run();
		},
	},
	{
		label: 'Text',
		icon: Type,
		command: (editor, slashPos, queryLength) => {
			editor
				.chain()
				.focus()
				.deleteRange({ from: slashPos, to: slashPos + 1 + queryLength })
				.setParagraph()
				.run();
		},
	},
	{
		label: 'Bullet List',
		icon: List,
		command: (editor, slashPos, queryLength) => {
			editor
				.chain()
				.focus()
				.deleteRange({ from: slashPos, to: slashPos + 1 + queryLength })
				.toggleBulletList()
				.run();
		},
	},
	{
		label: 'Ordered List',
		icon: ListOrdered,
		command: (editor, slashPos, queryLength) => {
			editor
				.chain()
				.focus()
				.deleteRange({ from: slashPos, to: slashPos + 1 + queryLength })
				.toggleOrderedList()
				.run();
		},
	},
	{
		label: 'Horizontal Rule',
		icon: Minus,
		command: (editor, slashPos, queryLength) => {
			editor
				.chain()
				.focus()
				.deleteRange({ from: slashPos, to: slashPos + 1 + queryLength })
				.setHorizontalRule()
				.run();
		},
	},
];
