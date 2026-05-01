import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useImagesContext, useContentContext } from '../../../../contexts';
import {
	Heading1,
	Heading2,
	Heading3,
	Heading4,
	Heading5,
	Heading6,
	Type,
	List,
	ListOrdered,
	Minus,
	ImagePlus,
	Images as ImagesIcon,
	FileText,
	Video,
	Music,
} from 'lucide-react';
import { PluginKey } from '@tiptap/pm/state';
import {
	autoUpdate,
	flip,
	offset,
	shift,
	useFloating,
	useTransitionStyles,
	type VirtualElement,
} from '@floating-ui/react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import {
	OptionMenuPlugin,
	type OptionMenuControls,
	type OptionMenuState,
} from '../plugins/option-menu-plugin';
import { useEditor } from '../hooks';
import { ImagesMenu } from './ImagesMenu';
import { ContentsMenu } from './ContentsMenu';
import { ImageEntry, ResourceInfo } from '@shared/types';

const pluginKey = new PluginKey('optionMenu');

function toLocalResourceUrl(filePath: string): string {
	const normalized = filePath.replace(/\\/g, '/');
	const urlPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
	return `local-resource://localhost${urlPath}`;
}

function toRelativePath(fromDir: string, toFile: string): string {
	const a = fromDir.replace(/\\/g, '/').replace(/\/$/, '').split('/').filter(Boolean);
	const b = toFile.replace(/\\/g, '/').split('/').filter(Boolean);
	let i = 0;
	while (i < a.length && i < b.length && a[i] === b[i]) i++;
	const ups = '../'.repeat(a.length - i);
	const rest = b.slice(i).join('/');
	return ups + rest || './';
}

type ItemKind = 'action' | 'submenu';

type Item = {
	id: string;
	label: string;
	Icon: typeof Type;
	kind: ItemKind;
	disabled?: boolean;
	run?: () => void;
};

type Section = {
	id: string;
	label: string;
	items: Item[];
};

const IMAGES_ITEM_ID = 'images-gallery';
const CONTENT_ITEM_ID = 'insertContent';

export function OptionMenu(): React.JSX.Element | null {
	const { editor } = useEditor();
	const { images } = useImagesContext();
	const { contents } = useContentContext();
	const referenceRectRef = useRef<(() => DOMRect) | null>(null);
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [imageSelectedIndex, setImageSelectedIndex] = useState(-1);
	const [imagesMenuOpen, setImagesMenuOpen] = useState(false);
	const [contentSelectedIndex, setContentSelectedIndex] = useState(-1);
	const [contentsMenuOpen, setContentsMenuOpen] = useState(false);
	const slashPosRef = useRef<number | null>(null);
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
	const [imagesAnchorEl, setImagesAnchorEl] = useState<HTMLElement | null>(null);
	const [contentsAnchorEl, setContentsAnchorEl] = useState<HTMLElement | null>(null);
	const menuControlsRef = useRef<OptionMenuControls>({
		forceHide: () => undefined,
		dismiss: () => undefined,
	});
	const isLockedRef = useRef(false);

	const queryRef = useRef(query);
	queryRef.current = query;
	const selectedIndexRef = useRef(selectedIndex);
	selectedIndexRef.current = selectedIndex;
	const imageSelectedIndexRef = useRef(imageSelectedIndex);
	imageSelectedIndexRef.current = imageSelectedIndex;
	const imagesMenuOpenRef = useRef(imagesMenuOpen);
	imagesMenuOpenRef.current = imagesMenuOpen;
	const imagesRef = useRef(images);
	imagesRef.current = images;
	const contentSelectedIndexRef = useRef(contentSelectedIndex);
	contentSelectedIndexRef.current = contentSelectedIndex;
	const contentsMenuOpenRef = useRef(contentsMenuOpen);
	contentsMenuOpenRef.current = contentsMenuOpen;
	const contentsRef = useRef(contents);
	contentsRef.current = contents;

	const virtualReference = useMemo<VirtualElement>(
		() => ({
			getBoundingClientRect: () => referenceRectRef.current?.() ?? new DOMRect(),
		}),
		[]
	);

	const { refs, floatingStyles, context, update } = useFloating({
		open,
		onOpenChange: setOpen,
		placement: 'bottom-start',
		strategy: 'fixed',
		whileElementsMounted: autoUpdate,
		middleware: [offset(6), flip({ fallbackPlacements: ['top-start'] }), shift({ padding: 8 })],
	});

	useEffect(() => {
		refs.setPositionReference(virtualReference);
	}, [refs, virtualReference]);

	const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
		duration: { open: 180, close: 110 },
		initial: { opacity: 0, transform: 'scale(0.96) translateY(-4px)' },
		open: {
			opacity: 1,
			transform: 'scale(1) translateY(0)',
			transitionTimingFunction: 'cubic-bezier(0.16, 1.2, 0.4, 1)',
		},
		close: { opacity: 0, transform: 'scale(0.97) translateY(-2px)' },
		common: ({ side }) => ({
			transformOrigin: side === 'top' ? 'left bottom' : 'left top',
		}),
	});

	useEffect(() => {
		setSelectedIndex(0);
	}, [query]);

	const deleteSlash = useCallback((): { slashPos: number; queryLength: number } | null => {
		const slashPos = slashPosRef.current;
		if (slashPos === null) return null;
		return { slashPos, queryLength: queryRef.current.length };
	}, []);

	const runHeading = useCallback(
		(level: 1 | 2 | 3 | 4 | 5 | 6) => {
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

	const runImageFromWorkspace = useCallback(
		(image: ImageEntry) => {
			const ctx = deleteSlash();
			if (!ctx) return;
			const storage = editor.storage as unknown as Record<string, Record<string, unknown>>;
			const basePath = (storage.image?.documentBasePath as string | null | undefined) ?? null;
			const src = basePath
				? toRelativePath(basePath, image.path)
				: toLocalResourceUrl(image.path);
			editor
				.chain()
				.focus()
				.deleteRange({ from: ctx.slashPos, to: ctx.slashPos + 1 + ctx.queryLength })
				.setImage({ src, alt: image.name })
				.run();
		},
		[editor, deleteSlash]
	);

	const runContentFromWorkspace = useCallback(
		async (content: ResourceInfo) => {
			const ctx = deleteSlash();
			if (!ctx) return;
			editor
				.chain()
				.focus()
				.deleteRange({ from: ctx.slashPos, to: ctx.slashPos + 1 + ctx.queryLength })
				.run();

			if (content.mimeType === 'application/pdf') {
				editor.chain().focus().insertContent(content.name).run();
				return;
			}

			try {
				const text = await window.workspace.readFile({ filePath: content.path });
				const json = editor.markdown?.parse(text);
				if (json) {
					editor.chain().focus().insertContent(json).run();
				} else {
					editor.chain().focus().insertContent(text).run();
				}
			} catch (err) {
				console.error('[OptionMenu] readFile failed:', err);
			}
		},
		[editor, deleteSlash]
	);

	const sections: Section[] = useMemo(
		() => [
			{
				id: 'text',
				label: 'Text',
				items: [
					{ id: 'paragraph', label: 'Text', Icon: Type, kind: 'action', run: runParagraph },
					{ id: 'h1', label: 'Heading 1', Icon: Heading1, kind: 'action', run: () => runHeading(1) },
					{ id: 'h2', label: 'Heading 2', Icon: Heading2, kind: 'action', run: () => runHeading(2) },
					{ id: 'h3', label: 'Heading 3', Icon: Heading3, kind: 'action', run: () => runHeading(3) },
					{ id: 'h4', label: 'Heading 4', Icon: Heading4, kind: 'action', run: () => runHeading(4) },
					{ id: 'h5', label: 'Heading 5', Icon: Heading5, kind: 'action', run: () => runHeading(5) },
					{ id: 'h6', label: 'Heading 6', Icon: Heading6, kind: 'action', run: () => runHeading(6) },
				],
			},
			{
				id: 'lists',
				label: 'Lists',
				items: [
					{ id: 'bulletList', label: 'Bullet list', Icon: List, kind: 'action', run: runBulletList },
					{ id: 'orderedList', label: 'Ordered list', Icon: ListOrdered, kind: 'action', run: runOrderedList },
				],
			},
			{
				id: 'divider',
				label: 'Divider',
				items: [
					{ id: 'hr', label: 'Horizontal rule', Icon: Minus, kind: 'action', run: runHorizontalRule },
				],
			},
			{
				id: 'content',
				label: 'Content',
				items: [
					{ id: 'image', label: 'Image', Icon: ImagePlus, kind: 'action', run: runImage },
					{ id: IMAGES_ITEM_ID, label: 'Images', Icon: ImagesIcon, kind: 'submenu' },
					{ id: 'video', label: 'Video', Icon: Video, kind: 'action', disabled: true },
					{ id: 'audio', label: 'Audio', Icon: Music, kind: 'action', disabled: true },
					{ id: CONTENT_ITEM_ID, label: 'Content', Icon: FileText, kind: 'submenu' },
				],
			},
		],
		[
			runParagraph,
			runHeading,
			runImage,
			runBulletList,
			runOrderedList,
			runHorizontalRule,
		]
	);

	const flatItems = useMemo(() => sections.flatMap((s) => s.items), [sections]);
	const flatItemsRef = useRef(flatItems);
	flatItemsRef.current = flatItems;

	const imagesItemIndex = useMemo(
		() => flatItems.findIndex((it) => it.id === IMAGES_ITEM_ID),
		[flatItems]
	);

	const contentItemIndex = useMemo(
		() => flatItems.findIndex((it) => it.id === CONTENT_ITEM_ID),
		[flatItems]
	);

	useEffect(() => {
		if (selectedIndex !== imagesItemIndex) {
			setImageSelectedIndex(-1);
			setImagesMenuOpen(false);
		}
		if (selectedIndex !== contentItemIndex) {
			setContentSelectedIndex(-1);
			setContentsMenuOpen(false);
		}
	}, [selectedIndex, imagesItemIndex, contentItemIndex]);

	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;
		const target = container.querySelector<HTMLElement>(`[data-item-index="${selectedIndex}"]`);
		if (!target) return;
		const cTop = container.scrollTop;
		const cBottom = cTop + container.clientHeight;
		const tTop = target.offsetTop;
		const tBottom = tTop + target.offsetHeight;
		if (tTop < cTop) container.scrollTop = tTop;
		else if (tBottom > cBottom) container.scrollTop = tBottom - container.clientHeight;
	}, [selectedIndex]);

	const moveSelection = useCallback((delta: 1 | -1) => {
		const items = flatItemsRef.current;
		if (items.length === 0) return;
		setSelectedIndex((prev) => {
			let next = prev;
			for (let i = 0; i < items.length; i++) {
				next = (next + delta + items.length) % items.length;
				if (!items[next].disabled) return next;
			}
			return prev;
		});
	}, []);

	const runByIndex = useCallback((idx: number) => {
		const item = flatItemsRef.current[idx];
		if (!item || item.disabled) return;
		if (item.kind === 'submenu') return;
		item.run?.();
	}, []);

	const handleClose = useCallback(() => {
		menuControlsRef.current.dismiss();
	}, []);

	const onKeyEvent = useCallback(
		(event: KeyboardEvent): boolean => {
			const idx = selectedIndexRef.current;
			const imgIdx = imageSelectedIndexRef.current;
			const cIdx = contentSelectedIndexRef.current;
			const inImagesSubmenu = imagesMenuOpenRef.current && idx === imagesItemIndex;
			const inContentsSubmenu = contentsMenuOpenRef.current && idx === contentItemIndex;

			if (inImagesSubmenu) {
				const len = imagesRef.current.length;

				if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
					event.preventDefault();
					if (len > 0) setImageSelectedIndex((p) => Math.min(len - 1, p + 1));
					return true;
				}

				if (event.key === 'ArrowLeft') {
					event.preventDefault();
					if (imgIdx <= 0) {
						setImagesMenuOpen(false);
						setImageSelectedIndex(-1);
					} else {
						setImageSelectedIndex((p) => p - 1);
					}
					return true;
				}

				if (event.key === 'ArrowUp') {
					event.preventDefault();
					setImageSelectedIndex((p) => Math.max(0, p - 1));
					return true;
				}

				if (event.key === 'Enter') {
					event.preventDefault();
					const img = imagesRef.current[imgIdx];
					if (img) runImageFromWorkspace(img);
					return true;
				}

				return false;
			}

			if (inContentsSubmenu) {
				const len = contentsRef.current.length;

				if (event.key === 'ArrowDown') {
					event.preventDefault();
					if (len > 0) setContentSelectedIndex((p) => Math.min(len - 1, p + 1));
					return true;
				}

				if (event.key === 'ArrowUp') {
					event.preventDefault();
					setContentSelectedIndex((p) => Math.max(0, p - 1));
					return true;
				}

				if (event.key === 'ArrowLeft') {
					event.preventDefault();
					setContentsMenuOpen(false);
					setContentSelectedIndex(-1);
					return true;
				}

				if (event.key === 'Enter') {
					event.preventDefault();
					const item = contentsRef.current[cIdx];
					if (item) runContentFromWorkspace(item);
					return true;
				}

				return false;
			}

			if (event.key === 'ArrowRight' && idx === imagesItemIndex && imagesRef.current.length > 0) {
				event.preventDefault();
				setImagesMenuOpen(true);
				setImageSelectedIndex(0);
				return true;
			}

			if (event.key === 'ArrowRight' && idx === contentItemIndex && contentsRef.current.length > 0) {
				event.preventDefault();
				setContentsMenuOpen(true);
				setContentSelectedIndex(0);
				return true;
			}

			if (event.key === 'ArrowDown') {
				event.preventDefault();
				moveSelection(1);
				return true;
			}

			if (event.key === 'ArrowUp') {
				event.preventDefault();
				moveSelection(-1);
				return true;
			}

			if (event.key === 'Enter') {
				event.preventDefault();
				runByIndex(selectedIndexRef.current);
				return true;
			}

			return false;
		},
		[runByIndex, runImageFromWorkspace, runContentFromWorkspace, moveSelection, imagesItemIndex, contentItemIndex]
	);

	const onKeyEventRef = useRef(onKeyEvent);
	onKeyEventRef.current = onKeyEvent;

	const handlePluginUpdate = useCallback(
		(state: OptionMenuState) => {
			if (state.getReferenceRect) {
				referenceRectRef.current = state.getReferenceRect;
			}
			if (state.open) {
				setQuery(state.query);
				slashPosRef.current = state.slashPos;
				update();
			} else {
				isLockedRef.current = false;
				setQuery('');
				setSelectedIndex(0);
				slashPosRef.current = null;
			}
			setOpen(state.open);
		},
		[update]
	);

	useEffect(() => {
		if (editor.isDestroyed) return;
		const plugin = OptionMenuPlugin({
			pluginKey,
			editor,
			onUpdate: handlePluginUpdate,
			onKeyEvent: (event) => onKeyEventRef.current(event),
			getIsLocked: () => isLockedRef.current,
			controls: menuControlsRef.current,
		});
		editor.registerPlugin(plugin, (newPlugin, plugins) => [newPlugin, ...plugins]);
		return () => {
			editor.unregisterPlugin(pluginKey);
		};
	}, [editor, handlePluginUpdate]);

	if (!isMounted) return null;

	return (
		<>
		<div ref={refs.setFloating} style={floatingStyles} className="z-50">
			<div style={transitionStyles} className="will-change-transform">
				<Card
					size="sm"
					className={cn(
						'w-[260px] gap-0! py-0! m-0! text-left overflow-visible!',
						'shadow-[0_0_20px_0_rgba(0,0,0,0.12)]! dark:shadow-[0_0_24px_0_rgba(0,0,0,0.55)]!'
					)}
				>
					<CardHeader className="px-3 py-2 border-b border-border/60 gap-0">
						<CardTitle className="text-xs font-medium text-muted-foreground leading-none">
							Blocks
						</CardTitle>
					</CardHeader>

					<CardContent
						ref={scrollContainerRef}
						className="flex flex-col gap-1 p-1! max-h-[340px] overflow-y-auto"
					>
						{sections.map((section, sIdx) => {
							const baseOffset = sections
								.slice(0, sIdx)
								.reduce((acc, s) => acc + s.items.length, 0);
							return (
								<div key={section.id} className="flex flex-col">
									<div className="px-2 pt-2 pb-1 text-xs text-muted-foreground">
										{section.label}
									</div>
									{section.items.map((item, iIdx) => {
										const flatIdx = baseOffset + iIdx;
										const isSelected = selectedIndex === flatIdx;
										const Icon = item.Icon;
										const isImagesItem = item.id === IMAGES_ITEM_ID;
										const isContentItem = item.id === CONTENT_ITEM_ID;
										const anchorSetter = isImagesItem
											? setImagesAnchorEl
											: isContentItem
												? setContentsAnchorEl
												: undefined;
										return (
											<div
												key={item.id}
												ref={anchorSetter}
											>
												<Button
													data-item-index={flatIdx}
													variant={isSelected ? 'secondary' : 'ghost'}
													disabled={item.disabled}
													className="w-full justify-start"
													onMouseEnter={() => {
														if (!item.disabled) setSelectedIndex(flatIdx);
													}}
													onMouseDown={(e) => {
														e.preventDefault();
														if (item.disabled) return;
														if (item.kind === 'submenu') {
															if (isImagesItem) {
																setSelectedIndex(flatIdx);
																setImagesMenuOpen((prev) => !prev);
															} else if (isContentItem) {
																setSelectedIndex(flatIdx);
																setContentsMenuOpen((prev) => !prev);
															}
															return;
														}
														item.run?.();
													}}
												>
													<Icon />
													<span className="truncate">{item.label}</span>
												</Button>
											</div>
										);
									})}
								</div>
							);
						})}
					</CardContent>

					<CardFooter className="p-1! border-t border-border/60 bg-transparent">
						<Button
							variant="ghost"
							size="sm"
							className="w-full justify-between"
							onMouseDown={(e) => {
								e.preventDefault();
								handleClose();
							}}
						>
							<span>Close menu</span>
							<kbd className="text-[10px] text-muted-foreground rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono">
								esc
							</kbd>
						</Button>
					</CardFooter>
				</Card>
			</div>
		</div>
		<ImagesMenu
			open={imagesMenuOpen}
			anchor={imagesAnchorEl}
			images={images}
			selectedIndex={imageSelectedIndex}
			onSelectIndex={setImageSelectedIndex}
			onPick={runImageFromWorkspace}
			onMouseEnter={() => {
				if (imagesItemIndex >= 0) setSelectedIndex(imagesItemIndex);
			}}
		/>
		<ContentsMenu
			open={contentsMenuOpen}
			anchor={contentsAnchorEl}
			contents={contents}
			selectedIndex={contentSelectedIndex}
			onSelectIndex={setContentSelectedIndex}
			onPick={runContentFromWorkspace}
			onMouseEnter={() => {
				if (contentItemIndex >= 0) setSelectedIndex(contentItemIndex);
			}}
		/>
		</>
	);
}
