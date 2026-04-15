import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, ImagePlus } from 'lucide-react';
import { useEditorContext } from '../EditorContext';
import { PluginKey } from '@tiptap/pm/state';
import { OptionMenuPlugin, type OptionMenuControls } from './option-menu-plugin';
import { MENU_ITEMS, type MenuItem } from './menu-items';
import { menuContainerClass } from './styles';
import { OptionMenuItem } from './OptionMenuItem';

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
					const closeMenu = (): void => {
						isLockedRef.current = false;
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
		[]
	);

	const filteredItems = allItems.filter((item) =>
		item.label.toLowerCase().includes(query.toLowerCase())
	);

	const filteredItemsRef = useRef(filteredItems);
	filteredItemsRef.current = filteredItems;

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

	const hasRegularItems = filteredItems.some((item) => item.section !== 'ai');
	const hasAiItems = filteredItems.some((item) => item.section === 'ai');
	const showSeparator = hasRegularItems && hasAiItems;
	const firstAiIndex = showSeparator
		? filteredItems.findIndex((i) => i.section === 'ai')
		: -1;

	return (
		<div
			ref={menuRef}
			className={menuContainerClass}
			style={{ visibility: 'hidden', position: 'absolute', minWidth: '220px' }}
		>
			{filteredItems.length > 0 ? (
				filteredItems.map((item, index) => {
					const isSelected = index === selectedIndex;
					const isFirstAiItem = index === firstAiIndex;
					const showSpinner = item.label === 'Continue with assistant' && loadingAssistant;

					return (
						<React.Fragment key={item.label}>
							{isFirstAiItem && <hr className="my-1 border-border/80 dark:border-border" />}
							<OptionMenuItem
								item={item}
								isSelected={isSelected}
								showSpinner={showSpinner}
								onMouseEnter={() => setSelectedIndex(index)}
								onSelect={() => executeCommand(item)}
							/>
						</React.Fragment>
					);
				})
			) : (
				<div className="px-2 py-1.5 text-sm text-muted-foreground">No results</div>
			)}
		</div>
	);
}
