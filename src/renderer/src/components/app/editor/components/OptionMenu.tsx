import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
	Heading,
	Type,
	List,
	ListOrdered,
	Minus,
	ImagePlus,
	Images as ImagesIcon,
	FileText,
} from 'lucide-react';
import { PluginKey } from '@tiptap/pm/state';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { ImageEntry } from '../../../../../../../shared/types';
import { OptionMenuPlugin, type OptionMenuControls } from '../plugins/option-menu-plugin';
import { useEditor } from '../hooks';

const pluginKey = new PluginKey('optionMenu');
const ITEM_COUNT = 10;
const IMAGES_INDEX = 8;

function toLocalResourceUrl(filePath: string): string {
	const normalized = filePath.replace(/\\/g, '/');
	const urlPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
	return `local-resource://localhost${urlPath}`;
}

export function OptionMenu(): React.JSX.Element {
	const { editor, onInsertContent } = useEditor();
	const menuRef = useRef<HTMLDivElement>(null);
	const [query, setQuery] = useState('');
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [imageSelectedIndex, setImageSelectedIndex] = useState(-1);
	const [images, setImages] = useState<ImageEntry[]>([]);
	const slashPosRef = useRef<number | null>(null);
	const menuControlsRef = useRef<OptionMenuControls>({ forceHide: () => undefined });
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

	useEffect(() => {
		if (selectedIndex !== IMAGES_INDEX) setImageSelectedIndex(-1);
	}, [selectedIndex]);

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
				case IMAGES_INDEX:
					return;
				case 9:
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
			const idx = selectedIndexRef.current;
			const imgIdx = imageSelectedIndexRef.current;
			const inSubmenu = idx === IMAGES_INDEX && imgIdx >= 0;

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

			if (
				event.key === 'ArrowRight' &&
				idx === IMAGES_INDEX &&
				imagesRef.current.length > 0
			) {
				event.preventDefault();
				setImageSelectedIndex(0);
				return true;
			}

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
		[runByIndex, runImageFromWorkspace]
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
			className="z-50 gap-1! p-1! m-0! text-left overflow-visible!"
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
			<div className="relative">
				<Button
					{...itemProps(IMAGES_INDEX, () => undefined)}
					onMouseEnter={() => setSelectedIndex(IMAGES_INDEX)}
				>
					<ImagesIcon />
					<span className="truncate">Images</span>
				</Button>
				{selectedIndex === IMAGES_INDEX && (
					<Card
						size="sm"
						className="absolute left-full top-0 ml-1 z-50 p-2! m-0! max-w-[220px] max-h-[220px] overflow-y-auto"
						onMouseEnter={() => setSelectedIndex(IMAGES_INDEX)}
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
			<Button {...itemProps(9, runInsertContent)}>
				<FileText />
				<span className="truncate">Insert content</span>
			</Button>
		</Card>
	);
}
