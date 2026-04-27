import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { ImageEntry } from '../../../../../../shared/types';
import {
	OptionMenuPlugin,
	type OptionMenuControls,
	type OptionMenuState,
} from '../plugins/option-menu-plugin';
import { useEditor } from '../hooks';
import { ImagesMenu } from './ImagesMenu';

const pluginKey = new PluginKey('optionMenu');

function toLocalResourceUrl(filePath: string): string {
	const normalized = filePath.replace(/\\/g, '/');
	const urlPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
	return `local-resource://localhost${urlPath}`;
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

export function OptionMenu(): React.JSX.Element | null {
	const { editor, onInsertContent } = useEditor();
	const referenceRectRef = useRef<(() => DOMRect) | null>(null);
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [imageSelectedIndex, setImageSelectedIndex] = useState(-1);
	const [images, setImages] = useState<ImageEntry[]>([]);
	const slashPosRef = useRef<number | null>(null);
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
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
	const imagesRef = useRef(images);
	imagesRef.current = images;

	const onInsertContentRef = useRef(onInsertContent);
	onInsertContentRef.current = onInsertContent;

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
		let cancelled = false;
		const loadImages = async (): Promise<void> => {
			try {
				const entries = await window.workspace.getImages();
				if (!cancelled) setImages(entries);
			} catch {
				if (!cancelled) setImages([]);
			}
		};
		void loadImages();
		const unsubscribe = window.workspace.onImagesChanged(() => {
			void loadImages();
		});
		return () => {
			cancelled = true;
			unsubscribe();
		};
	}, []);

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

	const runImageFromWorkspace = useCallback(
		(image: ImageEntry) => {
			const ctx = deleteSlash();
			if (!ctx) return;
			editor
				.chain()
				.focus()
				.deleteRange({ from: ctx.slashPos, to: ctx.slashPos + 1 + ctx.queryLength })
				.setImage({ src: toLocalResourceUrl(image.path), alt: image.name })
				.run();
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
				id: 'media',
				label: 'Media',
				items: [
					{ id: 'image', label: 'Image', Icon: ImagePlus, kind: 'action', run: runImage },
					{ id: IMAGES_ITEM_ID, label: 'Images', Icon: ImagesIcon, kind: 'submenu' },
					{ id: 'video', label: 'Video', Icon: Video, kind: 'action', disabled: true },
					{ id: 'audio', label: 'Audio', Icon: Music, kind: 'action', disabled: true },
				],
			},
			{
				id: 'content',
				label: 'Content',
				items: [
					{ id: 'bulletList', label: 'Bullet list', Icon: List, kind: 'action', run: runBulletList },
					{ id: 'orderedList', label: 'Ordered list', Icon: ListOrdered, kind: 'action', run: runOrderedList },
					{ id: 'hr', label: 'Horizontal rule', Icon: Minus, kind: 'action', run: runHorizontalRule },
					{ id: 'insertContent', label: 'Insert content', Icon: FileText, kind: 'action', run: runInsertContent },
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
			runInsertContent,
		]
	);

	const flatItems = useMemo(() => sections.flatMap((s) => s.items), [sections]);
	const flatItemsRef = useRef(flatItems);
	flatItemsRef.current = flatItems;

	const imagesItemIndex = useMemo(
		() => flatItems.findIndex((it) => it.id === IMAGES_ITEM_ID),
		[flatItems]
	);

	useEffect(() => {
		if (selectedIndex !== imagesItemIndex) setImageSelectedIndex(-1);
	}, [selectedIndex, imagesItemIndex]);

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
			const inSubmenu = idx === imagesItemIndex && imgIdx >= 0;

			if (inSubmenu) {
				const len = imagesRef.current.length;

				if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
					event.preventDefault();
					if (len > 0) setImageSelectedIndex((p) => Math.min(len - 1, p + 1));
					return true;
				}

				if (event.key === 'ArrowLeft') {
					event.preventDefault();
					if (imgIdx <= 0) setImageSelectedIndex(-1);
					else setImageSelectedIndex((p) => p - 1);
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

			if (event.key === 'ArrowRight' && idx === imagesItemIndex && imagesRef.current.length > 0) {
				event.preventDefault();
				setImageSelectedIndex(0);
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
		[runByIndex, runImageFromWorkspace, moveSelection, imagesItemIndex]
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
		<div ref={refs.setFloating} style={floatingStyles} className="z-50">
			<div style={transitionStyles} className="will-change-transform">
				<Card
					size="sm"
					className={cn(
						'w-[260px] gap-0! p-0! m-0! text-left overflow-visible!',
						'shadow-[0_0_20px_0_rgba(0,0,0,0.12)]! dark:shadow-[0_0_24px_0_rgba(0,0,0,0.55)]!'
					)}
				>
					<div className="px-3 py-1.5 border-b border-border/60">
						<div className="text-xs font-semibold leading-tight">Blocks</div>
					</div>

					<div
						ref={scrollContainerRef}
						className="flex flex-col gap-1 p-1 max-h-[340px] overflow-y-auto"
					>
						{sections.map((section, sIdx) => {
							const baseOffset = sections
								.slice(0, sIdx)
								.reduce((acc, s) => acc + s.items.length, 0);
							return (
								<div key={section.id} className="flex flex-col">
									<div className="px-2 pt-1.5 pb-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
										{section.label}
									</div>
									{section.items.map((item, iIdx) => {
										const flatIdx = baseOffset + iIdx;
										const isSelected = selectedIndex === flatIdx;
										const Icon = item.Icon;
										const isImagesItem = item.id === IMAGES_ITEM_ID;
										return (
											<div key={item.id} className="relative">
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
														if (item.kind === 'submenu') return;
														item.run?.();
													}}
												>
													<Icon />
													<span className="truncate">{item.label}</span>
												</Button>
												{isImagesItem && isSelected && (
													<Card
														size="sm"
														className="absolute left-full top-0 ml-1 z-50 p-2! m-0! max-w-[220px] max-h-[220px] overflow-y-auto"
														onMouseEnter={() => setSelectedIndex(flatIdx)}
													>
														{images.length > 0 ? (
															<div className="flex flex-wrap gap-1">
																{images.map((img, i) => (
																	<button
																		type="button"
																		key={img.id}
																		className={
																			'group relative h-[36px] w-[36px] overflow-hidden rounded-md border bg-accent/45 cursor-pointer dark:bg-muted/40 ' +
																			(i === imageSelectedIndex
																				? 'border-foreground ring-2 ring-ring'
																				: 'border-border/70')
																		}
																		title={img.name}
																		onMouseEnter={() => setImageSelectedIndex(i)}
																		onMouseDown={(e) => {
																			e.preventDefault();
																			runImageFromWorkspace(img);
																		}}
																	>
																		<img
																			src={toLocalResourceUrl(img.path)}
																			alt={img.name}
																			className="h-full w-full object-cover"
																			loading="lazy"
																		/>
																	</button>
																))}
															</div>
														) : (
															<span className="block px-1 py-2 text-xs text-muted-foreground">
																No images yet
															</span>
														)}
													</Card>
												)}
											</div>
										);
									})}
								</div>
							);
						})}
					</div>

					<div className="p-1 border-t border-border/60">
						<Button
							variant="ghost"
							size="sm"
							className="w-full justify-between"
							onMouseDown={(e) => {
								e.preventDefault();
								handleClose();
							}}
						>
							<span>Close</span>
							<kbd className="text-[10px] text-muted-foreground rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono">
								esc
							</kbd>
						</Button>
					</div>
				</Card>
			</div>
		</div>
	);
}
