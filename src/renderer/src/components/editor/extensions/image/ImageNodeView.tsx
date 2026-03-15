import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Label } from '../../../ui/Label';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '../../../ui/Popover';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '../../../ui/Tooltip';

interface ImageAttrs {
	src: string | null;
	alt: string | null;
	title: string | null;
	width: number | null;
	height: number | null;
}

const MIN_WIDTH = 80;
const ABSOLUTE_URL_RE = /^(https?:\/\/|data:|local-resource:\/\/)/;

function resolveImageSrc(src: string | null, documentBasePath: string | null): string | null {
	if (!src) return null;
	if (ABSOLUTE_URL_RE.test(src)) return src;
	if (!documentBasePath) return src;
	return `local-resource://localhost${documentBasePath}/${src}`;
}

export function ImageNodeView({
	node,
	editor,
	selected,
	getPos,
	updateAttributes,
	deleteNode,
}: NodeViewProps): React.JSX.Element {
	const { t } = useTranslation();
	const { src, alt, title, width, height } = node.attrs as ImageAttrs;
	const storage = editor.storage as unknown as Record<string, Record<string, unknown>>;
	const documentBasePath = (storage.image?.documentBasePath as string) ?? null;
	const resolvedSrc = useMemo(
		() => resolveImageSrc(src, documentBasePath),
		[src, documentBasePath],
	);

	const [loadError, setLoadError] = useState(false);
	const [resizing, setResizing] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [editAlt, setEditAlt] = useState(alt ?? '');
	const [editTitle, setEditTitle] = useState(title ?? '');
	const imgRef = useRef<HTMLImageElement>(null);
	const startXRef = useRef(0);
	const startWidthRef = useRef(0);
	const aspectRatioRef = useRef(1);

	const handleError = useCallback(() => {
		setLoadError(true);
	}, []);

	const handleLoad = useCallback(() => {
		setLoadError(false);
	}, []);

	const onPointerDown = useCallback(
		(e: React.PointerEvent) => {
			e.preventDefault();
			e.stopPropagation();

			const img = imgRef.current;
			if (!img) return;

			startXRef.current = e.clientX;
			startWidthRef.current = img.offsetWidth;
			aspectRatioRef.current = img.naturalHeight / img.naturalWidth || 1;
			setResizing(true);

			const onPointerMove = (ev: PointerEvent): void => {
				const diff = ev.clientX - startXRef.current;
				const newWidth = Math.max(MIN_WIDTH, startWidthRef.current + diff);
				const newHeight = Math.round(newWidth * aspectRatioRef.current);
				updateAttributes({ width: newWidth, height: newHeight });
			};

			const onPointerUp = (): void => {
				setResizing(false);
				document.removeEventListener('pointermove', onPointerMove);
				document.removeEventListener('pointerup', onPointerUp);
			};

			document.addEventListener('pointermove', onPointerMove);
			document.addEventListener('pointerup', onPointerUp);
		},
		[updateAttributes],
	);

	const handleDelete = useCallback(() => {
		deleteNode();
	}, [deleteNode]);

	const handleEditOpen = useCallback(
		(open: boolean) => {
			if (open) {
				setEditAlt(alt ?? '');
				setEditTitle(title ?? '');
			}
			setEditOpen(open);
		},
		[alt, title],
	);

	const handleEditSave = useCallback(() => {
		updateAttributes({ alt: editAlt.trim(), title: editTitle.trim() || null });
		setEditOpen(false);
	}, [editAlt, editTitle, updateAttributes]);

	const handleEditKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				handleEditSave();
			}
		},
		[handleEditSave],
	);

	const imgStyle: React.CSSProperties = {
		width: width ? `${width}px` : undefined,
		height: height ? `${height}px` : 'auto',
	};

	const isEditable = editor.isEditable;
	const showToolbar = isEditable && (selected || editOpen);

	return (
		<NodeViewWrapper contentEditable={false} className="my-4">
			<figure
				className={[
					'group relative inline-block max-w-full rounded-md',
					selected ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : '',
				]
					.filter(Boolean)
					.join(' ')}
			>
				{loadError || !resolvedSrc ? (
					<div className="flex h-32 w-64 items-center justify-center rounded-md border border-dashed border-border bg-muted text-sm text-muted-foreground">
						{alt ?? t('imageNode.notFound')}
					</div>
				) : (
					<div className="relative inline-block">
						{showToolbar && (
							<div className="absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-border bg-background/90 p-1 shadow-md backdrop-blur-sm">
								<Popover open={editOpen} onOpenChange={handleEditOpen}>
									<Tooltip>
										<TooltipTrigger asChild>
											<PopoverTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													className="h-7 w-7"
												>
													<Pencil className="h-3.5 w-3.5" />
												</Button>
											</PopoverTrigger>
										</TooltipTrigger>
										<TooltipContent side="top">
											{t('imageNode.edit')}
										</TooltipContent>
									</Tooltip>
									<PopoverContent
										className="w-72"
										side="bottom"
										align="center"
										onKeyDown={handleEditKeyDown}
									>
										<div className="grid gap-3">
											<div className="grid gap-1.5">
												<Label htmlFor="edit-alt">
													{t('imageNode.altText')}
												</Label>
												<Input
													id="edit-alt"
													placeholder={t('imageNode.altTextPlaceholder')}
													value={editAlt}
													onChange={(e) => setEditAlt(e.target.value)}
													autoFocus
												/>
											</div>
											<div className="grid gap-1.5">
												<Label htmlFor="edit-title">
													{t('imageNode.title')}
												</Label>
												<Input
													id="edit-title"
													placeholder={t('imageNode.titlePlaceholder')}
													value={editTitle}
													onChange={(e) => setEditTitle(e.target.value)}
												/>
											</div>
											<Button size="sm" onClick={handleEditSave}>
												{t('imageNode.save')}
											</Button>
										</div>
									</PopoverContent>
								</Popover>

								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
											onClick={handleDelete}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</TooltipTrigger>
									<TooltipContent side="top">
										{t('imageNode.delete')}
									</TooltipContent>
								</Tooltip>
							</div>
						)}

						<img
							ref={imgRef}
							src={resolvedSrc}
							alt={alt ?? ''}
							title={title ?? undefined}
							onError={handleError}
							onLoad={handleLoad}
							draggable={false}
							className="block max-w-full rounded-md"
							style={imgStyle}
						/>
						{(selected || resizing) && (
							<div
								onPointerDown={onPointerDown}
								className="absolute bottom-0 right-0 h-3 w-3 translate-x-1/2 translate-y-1/2 cursor-nwse-resize rounded-full border-2 border-background bg-ring shadow-sm"
							/>
						)}
					</div>
				)}
			</figure>
		</NodeViewWrapper>
	);
}
