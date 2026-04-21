import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Heading, Type, List, ListOrdered, Minus, ImagePlus, FileText } from 'lucide-react';
import { PluginKey } from '@tiptap/pm/state';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { OptionMenuPlugin, type OptionMenuControls } from '../plugins/option-menu-plugin';
import { useEditor } from '../hooks';

const pluginKey = new PluginKey('optionMenu');
const ITEM_COUNT = 9;

export function OptionMenu(): React.JSX.Element {
	const { editor, onInsertContent } = useEditor();
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

	const onInsertContentRef = useRef(onInsertContent);
	onInsertContentRef.current = onInsertContent;

	useEffect(() => {
		setSelectedIndex(0);
	}, [query]);

	const deleteSlash = useCallback((): { slashPos: number; queryLength: number } | null => {
		const slashPos = slashPosRef.current;
		if (slashPos === null) return null;
		return { slashPos, queryLength: queryRef.current.length };
	}, []);

	const runHeading = useCallback(
		(level: 1 | 2 | 3) => {
			const ctx = deleteSlash();
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
		const ctx = deleteSlash();
		if (!ctx) return;
		editor
			.chain()
			.focus()
			.deleteRange({ from: ctx.slashPos, to: ctx.slashPos + 1 + ctx.queryLength })
			.setParagraph()
			.run();
	}, [editor, deleteSlash]);

	const runBulletList = useCallback(() => {
		const ctx = deleteSlash();
		if (!ctx) return;
		editor
			.chain()
			.focus()
			.deleteRange({ from: ctx.slashPos, to: ctx.slashPos + 1 + ctx.queryLength })
			.toggleBulletList()
			.run();
	}, [editor, deleteSlash]);

	const runOrderedList = useCallback(() => {
		const ctx = deleteSlash();
		if (!ctx) return;
		editor
			.chain()
			.focus()
			.deleteRange({ from: ctx.slashPos, to: ctx.slashPos + 1 + ctx.queryLength })
			.toggleOrderedList()
			.run();
	}, [editor, deleteSlash]);

	const runHorizontalRule = useCallback(() => {
		const ctx = deleteSlash();
		if (!ctx) return;
		editor
			.chain()
			.focus()
			.deleteRange({ from: ctx.slashPos, to: ctx.slashPos + 1 + ctx.queryLength })
			.setHorizontalRule()
			.run();
	}, [editor, deleteSlash]);

	const runImage = useCallback(() => {
		const ctx = deleteSlash();
		if (!ctx) return;
		editor
			.chain()
			.focus()
			.deleteRange({ from: ctx.slashPos, to: ctx.slashPos + 1 + ctx.queryLength })
			.insertImagePlaceholder()
			.run();
	}, [editor, deleteSlash]);

	const runInsertContent = useCallback(() => {
		const ctx = deleteSlash();
		if (!ctx) return;
		editor
			.chain()
			.focus()
			.deleteRange({ from: ctx.slashPos, to: ctx.slashPos + 1 + ctx.queryLength })
			.run();
		onInsertContentRef.current?.();
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
					return runInsertContent();
			}
		},
		[
			runHeading,
			runParagraph,
			runBulletList,
			runOrderedList,
			runHorizontalRule,
			runImage,
			runInsertContent,
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

	const onKeyEventRef = useRef(onKeyEvent);
	onKeyEventRef.current = onKeyEvent;

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
			onKeyEvent: (event) => onKeyEventRef.current(event),
			getIsLocked: () => isLockedRef.current,
			controls: menuControlsRef.current,
		});

		editor.registerPlugin(plugin, (newPlugin, plugins) => [newPlugin, ...plugins]);
		return () => {
			editor.unregisterPlugin(pluginKey);
		};
	}, [editor]);

	const itemProps = (
		index: number,
		onRun: () => void
	): {
		variant: 'secondary' | 'ghost';
		className: string;
		onMouseEnter: () => void;
		onMouseDown: (e: React.MouseEvent) => void;
	} => ({
		variant: index === selectedIndex ? 'secondary' : 'ghost',
		className: 'w-full justify-start',
		onMouseEnter: () => setSelectedIndex(index),
		onMouseDown: (e) => {
			e.preventDefault();
			onRun();
		},
	});

	return (
		<Card
			ref={menuRef}
			size="sm"
			className="z-50 gap-1! p-1! m-0! text-left"
			style={{ visibility: 'hidden', position: 'absolute' }}
		>
			<Button {...itemProps(0, () => runHeading(1))}>
				<Heading />
				<span className="truncate">Heading 1</span>
			</Button>
			<Button {...itemProps(1, () => runHeading(2))}>
				<Heading />
				<span className="truncate">Heading 2</span>
			</Button>
			<Button {...itemProps(2, () => runHeading(3))}>
				<Heading />
				<span className="truncate">Heading 3</span>
			</Button>
			<Button {...itemProps(3, runParagraph)}>
				<Type />
				<span className="truncate">Text</span>
			</Button>
			<Button {...itemProps(4, runBulletList)}>
				<List />
				<span className="truncate">Bullet List</span>
			</Button>
			<Button {...itemProps(5, runOrderedList)}>
				<ListOrdered />
				<span className="truncate">Ordered List</span>
			</Button>
			<Button {...itemProps(6, runHorizontalRule)}>
				<Minus />
				<span className="truncate">Horizontal Rule</span>
			</Button>
			<Button {...itemProps(7, runImage)}>
				<ImagePlus />
				<span className="truncate">Image</span>
			</Button>
			<Button {...itemProps(8, runInsertContent)}>
				<FileText />
				<span className="truncate">Insert content</span>
			</Button>
		</Card>
	);
}
