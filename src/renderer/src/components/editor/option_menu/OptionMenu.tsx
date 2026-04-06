import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import {
	Heading,
	Type,
	List,
	ListOrdered,
	Sparkles,
	Minus,
	ImagePlus,
	Loader2,
} from 'lucide-react';
import { useEditorContext } from '../EditorContext';
import { PluginKey } from '@tiptap/pm/state';
import { OptionMenuPlugin, type OptionMenuControls } from './option-menu-plugin';
import { cn } from '@/lib/utils';

interface OptionMenuProps {
	onContinueWithAssistant?: (
		before: string,
		after: string,
		cursorPos: number,
		closeMenu: () => void
	) => void;
	onInsertImage?: () => void;
}

interface MenuItem {
	label: string;
	icon: React.ElementType;
	command: (editor: Editor, slashPos: number, queryLength: number) => void;
	section?: 'ai';
	tone?: 'default' | 'ai';
}

const MENU_ITEMS: MenuItem[] = [
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

const pluginKey = new PluginKey('optionMenu');

const menuContainerClass =
	'z-50 flex min-w-[220px] flex-col rounded-xl border border-border/80 bg-popover/95 p-1.5 text-popover-foreground shadow-[0_18px_40px_hsl(var(--foreground)/0.14)] ring-1 ring-black/5 backdrop-blur-md dark:border-border dark:bg-popover dark:ring-[hsl(var(--border)/0.7)] dark:shadow-[0_18px_44px_hsl(0_0%_0%/0.46)]';

function getItemClass(isSelected: boolean): string {
	return isSelected
		? 'bg-accent text-foreground shadow-sm ring-1 ring-border/70 dark:bg-accent/95 dark:text-foreground dark:ring-[hsl(var(--border)/0.7)]'
		: 'text-popover-foreground hover:bg-accent/95 hover:text-foreground dark:text-popover-foreground dark:hover:bg-accent dark:hover:text-foreground';
}

function getIconClass(tone: MenuItem['tone'], isSelected: boolean): string {
	if (tone === 'ai') {
		return isSelected
			? 'bg-[hsl(var(--info))] text-[hsl(var(--info-foreground))] shadow-sm'
			: 'bg-[hsl(var(--info)/0.16)] text-[hsl(var(--info))] dark:bg-[hsl(var(--info)/0.22)] dark:text-[hsl(var(--info))]';
	}

	return isSelected
		? 'bg-background/80 text-foreground shadow-sm dark:bg-background/70 dark:text-foreground'
		: 'text-foreground/72 dark:text-foreground/82';
}

export function OptionMenu({ onContinueWithAssistant }: OptionMenuProps): React.JSX.Element {
	const { editor } = useEditorContext();
	const menuRef = useRef<HTMLDivElement>(null);
	const [query, setQuery] = useState('');
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [loadingAssistant, setLoadingAssistant] = useState(false);
	const slashPosRef = useRef<number | null>(null);
	const menuControlsRef = useRef<OptionMenuControls>({ forceHide: () => undefined });
	const isLockedRef = useRef(false);

	const queryRef = useRef(query);
	queryRef.current = query;
	const selectedIndexRef = useRef(selectedIndex);
	selectedIndexRef.current = selectedIndex;

	// Build the full item list, appending the AI item so the command closes over
	// the latest onContinueWithAssistant callback via a ref.
	const onContinueWithAssistantRef = useRef(onContinueWithAssistant);
	onContinueWithAssistantRef.current = onContinueWithAssistant;

	const allItems = useMemo<MenuItem[]>(
		() => [
			...MENU_ITEMS,
			{
				label: 'Image',
				icon: ImagePlus,
				command: (ed, slashPos, queryLength) => {
					ed.chain()
						.focus()
						.deleteRange({ from: slashPos, to: slashPos + 1 + queryLength })
						.insertImagePlaceholder()
						.run();
				},
			},
			{
				label: 'Continue with assistant',
				icon: Sparkles,
				section: 'ai' as const,
				tone: 'ai',
				command: (ed, slashPos, queryLength) => {
					ed.chain()
						.focus()
						.deleteRange({ from: slashPos, to: slashPos + 1 + queryLength })
						.setMeta('preventEditorUpdate', true)
						.run();
					const { from } = ed.state.selection;
					const storage = ed.storage as unknown as Record<string, Record<string, unknown>>;
					const serializer = storage.markdown?.serializer as
						| { serialize: (node: unknown) => string }
						| undefined;
					const docSize = ed.state.doc.content.size;
					const subDocBefore = ed.state.doc.cut(0, from);
					const subDocAfter = ed.state.doc.cut(from, docSize);
					const markdownBeforeCursor =
						serializer?.serialize(subDocBefore) ?? ed.state.doc.textBetween(0, from, '\n');
					const markdownAfterCursor =
						serializer?.serialize(subDocAfter) ?? ed.state.doc.textBetween(from, docSize, '\n');
					isLockedRef.current = true;
					setLoadingAssistant(true);
					const closeMenu = (): void => {
						isLockedRef.current = false;
						setLoadingAssistant(false);
						menuControlsRef.current.forceHide();
					};
					onContinueWithAssistantRef.current?.(
						markdownBeforeCursor,
						markdownAfterCursor,
						from,
						closeMenu
					);
				},
			},
		],
		// allItems is stable — the AI callback is accessed via ref so no dep needed.
		[]
	);

	const filteredItems = allItems.filter((item) =>
		item.label.toLowerCase().includes(query.toLowerCase())
	);

	const filteredItemsRef = useRef(filteredItems);
	filteredItemsRef.current = filteredItems;

	// Reset selected index when query changes
	useEffect(() => {
		setSelectedIndex(0);
	}, [query]);

	const executeCommand = useCallback(
		(item: MenuItem) => {
			const slashPos = slashPosRef.current;
			if (slashPos === null) return;
			item.command(editor, slashPos, queryRef.current.length);
		},
		[editor]
	);

	const onKeyEvent = useCallback(
		(event: KeyboardEvent): boolean => {
			const items = filteredItemsRef.current;
			const count = Math.max(items.length, 1);

			if (event.key === 'ArrowDown') {
				event.preventDefault();
				setSelectedIndex((prev) => (prev + 1) % count);
				return true;
			}

			if (event.key === 'ArrowUp') {
				event.preventDefault();
				setSelectedIndex((prev) => (prev - 1 + count) % count);
				return true;
			}

			if (event.key === 'Enter') {
				event.preventDefault();
				const idx = selectedIndexRef.current;
				if (items[idx]) {
					executeCommand(items[idx]);
				}
				return true;
			}

			return false;
		},
		[executeCommand]
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
				setLoadingAssistant(false);
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

	// Determine whether a separator is needed: only when there are both regular
	// items and AI items visible after filtering.
	const hasRegularItems = filteredItems.some((item) => item.section !== 'ai');
	const hasAiItems = filteredItems.some((item) => item.section === 'ai');
	const showSeparator = hasRegularItems && hasAiItems;

	return (
		<div
			ref={menuRef}
			className={menuContainerClass}
			style={{ visibility: 'hidden', position: 'absolute', minWidth: '220px' }}
		>
			{filteredItems.length > 0 ? (
				filteredItems.map((item, index) => {
					const Icon = item.icon;
					const isAiItem = item.section === 'ai';
					const isSelected = index === selectedIndex;
					const tone = item.tone ?? 'default';
					// Show the separator immediately before the first AI item, but only
					// when there are regular items above it.
					const isFirstAiItem =
						isAiItem &&
						showSeparator &&
						index === filteredItems.findIndex((i) => i.section === 'ai');

					const isAssistantItem = item.label === 'Continue with assistant';
					const showSpinner = isAssistantItem && loadingAssistant;

					return (
						<React.Fragment key={item.label}>
							{isFirstAiItem && <hr className="my-1 border-border/80 dark:border-border" />}
							<button
								className={cn(
									'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
									getItemClass(isSelected)
								)}
								onMouseEnter={() => setSelectedIndex(index)}
								onMouseDown={(e) => {
									e.preventDefault();
									if (!showSpinner) {
										executeCommand(item);
									}
								}}
								disabled={showSpinner}
							>
								<span
									className={cn(
										'flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors',
										getIconClass(tone, isSelected)
									)}
								>
									{showSpinner ? (
										<Loader2 className="h-4 w-4 shrink-0 animate-spin" />
									) : (
										<Icon className="h-4 w-4 shrink-0" />
									)}
								</span>
								<span className="truncate">{item.label}</span>
							</button>
						</React.Fragment>
					);
				})
			) : (
				<div className="px-2 py-1.5 text-sm text-muted-foreground">No results</div>
			)}
		</div>
	);
}
