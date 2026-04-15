import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { Heading, Type, List, ListOrdered, Minus, Sparkles, ImagePlus } from 'lucide-react';
import { useEditorContext } from '../EditorContext';
import { PluginKey } from '@tiptap/pm/state';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { OptionMenuPlugin, type OptionMenuControls } from './option-menu-plugin';
import { menuContainerClass, getIconClass } from './styles';

interface OptionMenuProps {
	onContinueWithAssistant?: (
		before: string,
		after: string,
		cursorPos: number,
		closeMenu: () => void
	) => void;
	onInsertImage?: () => void;
}

const pluginKey = new PluginKey('optionMenu');
const ITEM_COUNT = 9;
const FIRST_AI_INDEX = 8;

export function OptionMenu({ onContinueWithAssistant }: OptionMenuProps): React.JSX.Element {
	const { editor } = useEditorContext();
	const menuRef = useRef<HTMLDivElement>(null);
	const [query, setQuery] = useState('');
	const [selectedIndex, setSelectedIndex] = useState(0);
	const slashPosRef = useRef<number | null>(null);
	const menuControlsRef = useRef<OptionMenuControls>({ forceHide: () => undefined });
	const isLockedRef = useRef(false);

	const queryRef = useRef(query);
	queryRef.current = query;
	const selectedIndexRef = useRef(selectedIndex);
	selectedIndexRef.current = selectedIndex;

	const onContinueWithAssistantRef = useRef(onContinueWithAssistant);
	onContinueWithAssistantRef.current = onContinueWithAssistant;

	useEffect(() => {
		setSelectedIndex(0);
	}, [query]);

	const deleteSlash = useCallback(
		(ed: Editor): { slashPos: number; queryLength: number } | null => {
			const slashPos = slashPosRef.current;
			if (slashPos === null) return null;
			const queryLength = queryRef.current.length;
			return { slashPos, queryLength };
		},
		[]
	);

	const runHeading = useCallback(
		(level: 1 | 2 | 3) => {
			const ctx = deleteSlash(editor);
			if (!ctx) return;
			editor
				.chain()
				.focus()
				.deleteRange({ from: ctx.slashPos, to: ctx.slashPos + 1 + ctx.queryLength })
				.setHeading({ level })
				.run();
		},
		[editor, deleteSlash]
	);

	const runParagraph = useCallback(() => {
		const ctx = deleteSlash(editor);
		if (!ctx) return;
		editor
			.chain()
			.focus()
			.deleteRange({ from: ctx.slashPos, to: ctx.slashPos + 1 + ctx.queryLength })
			.setParagraph()
			.run();
	}, [editor, deleteSlash]);

	const runBulletList = useCallback(() => {
		const ctx = deleteSlash(editor);
		if (!ctx) return;
		editor
			.chain()
			.focus()
			.deleteRange({ from: ctx.slashPos, to: ctx.slashPos + 1 + ctx.queryLength })
			.toggleBulletList()
			.run();
	}, [editor, deleteSlash]);

	const runOrderedList = useCallback(() => {
		const ctx = deleteSlash(editor);
		if (!ctx) return;
		editor
			.chain()
			.focus()
			.deleteRange({ from: ctx.slashPos, to: ctx.slashPos + 1 + ctx.queryLength })
			.toggleOrderedList()
			.run();
	}, [editor, deleteSlash]);

	const runHorizontalRule = useCallback(() => {
		const ctx = deleteSlash(editor);
		if (!ctx) return;
		editor
			.chain()
			.focus()
			.deleteRange({ from: ctx.slashPos, to: ctx.slashPos + 1 + ctx.queryLength })
			.setHorizontalRule()
			.run();
	}, [editor, deleteSlash]);

	const runImage = useCallback(() => {
		const ctx = deleteSlash(editor);
		if (!ctx) return;
		editor
			.chain()
			.focus()
			.deleteRange({ from: ctx.slashPos, to: ctx.slashPos + 1 + ctx.queryLength })
			.insertImagePlaceholder()
			.run();
	}, [editor, deleteSlash]);

	const runContinueWithAssistant = useCallback(() => {
		const ctx = deleteSlash(editor);
		if (!ctx) return;
		editor
			.chain()
			.focus()
			.deleteRange({ from: ctx.slashPos, to: ctx.slashPos + 1 + ctx.queryLength })
			.setMeta('preventEditorUpdate', true)
			.run();
		const { from } = editor.state.selection;
		const storage = editor.storage as unknown as Record<string, Record<string, unknown>>;
		const serializer = storage.markdown?.serializer as
			| { serialize: (node: unknown) => string }
			| undefined;
		const docSize = editor.state.doc.content.size;
		const subDocBefore = editor.state.doc.cut(0, from);
		const subDocAfter = editor.state.doc.cut(from, docSize);
		const markdownBeforeCursor =
			serializer?.serialize(subDocBefore) ?? editor.state.doc.textBetween(0, from, '\n');
		const markdownAfterCursor =
			serializer?.serialize(subDocAfter) ?? editor.state.doc.textBetween(from, docSize, '\n');
		isLockedRef.current = true;
		const closeMenu = (): void => {
			isLockedRef.current = false;
			menuControlsRef.current.forceHide();
		};
		onContinueWithAssistantRef.current?.(markdownBeforeCursor, markdownAfterCursor, from, closeMenu);
	}, [editor, deleteSlash]);

	const runByIndex = useCallback(
		(idx: number) => {
			switch (idx) {
				case 0:
					return runHeading(1);
				case 1:
					return runHeading(2);
				case 2:
					return runHeading(3);
				case 3:
					return runParagraph();
				case 4:
					return runBulletList();
				case 5:
					return runOrderedList();
				case 6:
					return runHorizontalRule();
				case 7:
					return runImage();
				case 8:
					return runContinueWithAssistant();
			}
		},
		[
			runHeading,
			runParagraph,
			runBulletList,
			runOrderedList,
			runHorizontalRule,
			runImage,
			runContinueWithAssistant,
		]
	);

	const onKeyEvent = useCallback(
		(event: KeyboardEvent): boolean => {
			if (event.key === 'ArrowDown') {
				event.preventDefault();
				setSelectedIndex((prev) => (prev + 1) % ITEM_COUNT);
				return true;
			}

			if (event.key === 'ArrowUp') {
				event.preventDefault();
				setSelectedIndex((prev) => (prev - 1 + ITEM_COUNT) % ITEM_COUNT);
				return true;
			}

			if (event.key === 'Enter') {
				event.preventDefault();
				runByIndex(selectedIndexRef.current);
				return true;
			}

			return false;
		},
		[runByIndex]
	);

	useEffect(() => {
		const el = menuRef.current;
		if (!el || editor.isDestroyed) return;

		const plugin = OptionMenuPlugin({
			pluginKey,
			editor,
			element: el,
			onShow: () => {},
			onHide: () => {
				isLockedRef.current = false;
				setQuery('');
				setSelectedIndex(0);
				slashPosRef.current = null;
			},
			onQueryChange: (q, slashPos) => {
				setQuery(q);
				slashPosRef.current = slashPos;
			},
			onKeyEvent,
			getIsLocked: () => isLockedRef.current,
			controls: menuControlsRef.current,
		});

		editor.registerPlugin(plugin);
		return () => {
			editor.unregisterPlugin(pluginKey);
		};
	}, [editor, onKeyEvent]);

	const renderIcon = (Icon: React.ElementType, isSelected: boolean, tone: 'default' | 'ai'): React.JSX.Element => (
		<span
			className={cn(
				'flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors',
				getIconClass(tone, isSelected)
			)}
		>
			<Icon className="h-4 w-4 shrink-0" />
		</span>
	);

	const itemProps = (index: number, onRun: () => void): {
		variant: 'secondary' | 'ghost';
		onMouseEnter: () => void;
		onMouseDown: (e: React.MouseEvent) => void;
	} => ({
		variant: index === selectedIndex ? 'secondary' : 'ghost',
		onMouseEnter: () => setSelectedIndex(index),
		onMouseDown: (e) => {
			e.preventDefault();
			onRun();
		},
	});

	return (
		<div
			ref={menuRef}
			className={menuContainerClass}
			style={{ visibility: 'hidden', position: 'absolute', minWidth: '220px' }}
		>
			<Button {...itemProps(0, () => runHeading(1))}>
				{renderIcon(Heading, selectedIndex === 0, 'default')}
				<span className="truncate">Heading 1</span>
			</Button>
			<Button {...itemProps(1, () => runHeading(2))}>
				{renderIcon(Heading, selectedIndex === 1, 'default')}
				<span className="truncate">Heading 2</span>
			</Button>
			<Button {...itemProps(2, () => runHeading(3))}>
				{renderIcon(Heading, selectedIndex === 2, 'default')}
				<span className="truncate">Heading 3</span>
			</Button>
			<Button {...itemProps(3, runParagraph)}>
				{renderIcon(Type, selectedIndex === 3, 'default')}
				<span className="truncate">Text</span>
			</Button>
			<Button {...itemProps(4, runBulletList)}>
				{renderIcon(List, selectedIndex === 4, 'default')}
				<span className="truncate">Bullet List</span>
			</Button>
			<Button {...itemProps(5, runOrderedList)}>
				{renderIcon(ListOrdered, selectedIndex === 5, 'default')}
				<span className="truncate">Ordered List</span>
			</Button>
			<Button {...itemProps(6, runHorizontalRule)}>
				{renderIcon(Minus, selectedIndex === 6, 'default')}
				<span className="truncate">Horizontal Rule</span>
			</Button>
			<Button {...itemProps(7, runImage)}>
				{renderIcon(ImagePlus, selectedIndex === 7, 'default')}
				<span className="truncate">Image</span>
			</Button>
			<hr className="my-1 border-border/80 dark:border-border" />
			<Button {...itemProps(FIRST_AI_INDEX, runContinueWithAssistant)}>
				{renderIcon(Sparkles, selectedIndex === FIRST_AI_INDEX, 'ai')}
				<span className="truncate">Continue with assistant</span>
			</Button>
		</div>
	);
}
