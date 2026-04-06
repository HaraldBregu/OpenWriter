import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import {
	Sparkles,
	Pencil,
	Trash2,
	Download,
	Copy,
	MessageSquare,
	Maximize2,
	ZoomIn,
	Ellipsis,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppButton } from '@/components/app/AppButton';
import {
	AppTooltip,
	AppTooltipTrigger,
	AppTooltipContent,
	AppTooltipProvider,
} from '@/components/app/AppTooltip';
import { ImageEditor } from './ImageEditor';

interface ImageAttrs {
	src: string | null;
	alt: string | null;
	title: string | null;
}

const ABSOLUTE_URL_RE = /^(https?:\/\/|data:|local-resource:\/\/)/;

function resolveImageSrc(src: string | null, documentBasePath: string | null): string | null {
	if (!src) return null;
	if (ABSOLUTE_URL_RE.test(src)) return src;
	if (!documentBasePath) return src;
	const normalized = documentBasePath.replace(/\\/g, '/');
	const urlPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
	return `local-resource://localhost${urlPath}/${src}`;
}

interface ActionButtonProps {
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
}

function ActionButton({ icon, label, onClick }: ActionButtonProps): React.JSX.Element {
	return (
		<AppTooltip>
			<AppTooltipTrigger asChild>
				<AppButton
					variant="ghost"
					size="icon-xs"
					aria-label={label}
					onClick={onClick}
					className="h-5 w-5 text-muted-foreground hover:text-foreground [&_svg]:h-3 [&_svg]:w-3"
				>
					{icon}
				</AppButton>
			</AppTooltipTrigger>
			<AppTooltipContent side="top" sideOffset={4} className="px-2 py-1 text-xs">
				{label}
			</AppTooltipContent>
		</AppTooltip>
	);
}

export function ImageNodeView({ node, editor, getPos }: NodeViewProps): React.JSX.Element {
	const { t } = useTranslation();
	const { src, alt, title } = node.attrs as ImageAttrs;
	const storage = editor.storage as unknown as Record<string, Record<string, unknown>>;
	const documentBasePath = (storage.image?.documentBasePath as string) ?? null;
	const resolvedSrc = useMemo(
		() => resolveImageSrc(src, documentBasePath),
		[src, documentBasePath]
	);

	const [loadError, setLoadError] = useState(false);
	const [hovered, setHovered] = useState(false);
	const [editing, setEditing] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const prevSrcRef = useRef(resolvedSrc);

	useEffect(() => {
		if (prevSrcRef.current !== resolvedSrc) {
			prevSrcRef.current = resolvedSrc;
			setLoadError(false);
		}
	}, [resolvedSrc]);

	const handleError = useCallback(() => {
		setLoadError(true);
	}, []);

	const handleLoad = useCallback(() => {
		setLoadError(false);
	}, []);

	const handleDelete = useCallback(() => {
		const pos = getPos();
		if (typeof pos !== 'number') return;
		editor
			.chain()
			.focus()
			.deleteRange({ from: pos, to: pos + node.nodeSize })
			.run();
	}, [editor, getPos, node.nodeSize]);

	const handleCopy = useCallback(async () => {
		if (!resolvedSrc) return;
		try {
			const response = await fetch(resolvedSrc);
			const blob = await response.blob();
			await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
		} catch {
			/* clipboard write may not be supported for all image types */
		}
	}, [resolvedSrc]);

	const handleDownload = useCallback(() => {
		if (!resolvedSrc) return;
		const link = document.createElement('a');
		link.href = resolvedSrc;
		link.download = alt ?? 'image';
		link.click();
	}, [resolvedSrc, alt]);

	const handleAskAI = useCallback(() => {
		/* TODO: integrate AI ask flow */
	}, []);

	const handleDeleteConfirm = useCallback(() => {
		handleDelete();
		setShowDeleteConfirm(false);
	}, []);

	const handleEdit = useCallback(() => {
		setEditing(true);
	}, []);

	const handleEditorSave = useCallback(
		async (dataUri: string) => {
			const pos = getPos();
			if (typeof pos !== 'number') return;

			const imgStorage = editor.storage as unknown as Record<string, Record<string, unknown>>;
			const saveHandler = imgStorage.image?.onImageEditSave as
				| ((dataUri: string) => Promise<string>)
				| null;

			const finalSrc = saveHandler ? await saveHandler(dataUri) : dataUri;

			if (editor.isDestroyed) return;

			editor.view.dispatch(
				editor.view.state.tr.setNodeMarkup(pos, undefined, {
					...node.attrs,
					src: finalSrc,
				})
			);
			setEditing(false);
		},
		[editor, getPos, node.attrs]
	);

	const handleEditorCancel = useCallback(() => {
		setEditing(false);
	}, []);

	const showToolbar = hovered && !loadError && resolvedSrc;

	return (
		<NodeViewWrapper contentEditable={false} className="my-4">
			{editing && resolvedSrc ? (
				<ImageEditor
					src={resolvedSrc}
					alt={alt}
					onSave={handleEditorSave}
					onCancel={handleEditorCancel}
				/>
			) : (
				<div
					className="inline-block max-w-full"
					onMouseEnter={() => setHovered(true)}
					onMouseLeave={() => setHovered(false)}
				>
					<figure className="relative inline-block max-w-full rounded-md">
						{/* Floating toolbar overlay */}
						<AppTooltipProvider delayDuration={300}>
							<div
								className={cn(
									'absolute top-3 right-3 z-10',
									'flex items-center gap-0.5 rounded-xl',
									'border border-border/80 bg-popover/95 p-1.5',
									'backdrop-blur-md shadow-lg',
									'pointer-events-none opacity-0 transition-opacity duration-150',
									showToolbar && 'pointer-events-auto opacity-100'
								)}
							>
								<AppButton
									variant="ghost"
									size="icon-xs"
									aria-label={t('imageNode.askAI')}
									onClick={handleAskAI}
									className="flex items-center gap-1 w-auto px-1.5 text-muted-foreground hover:text-foreground [&_svg]:h-3 [&_svg]:w-3"
								>
									<Sparkles />
									<span className="text-xs font-medium">Ask AI</span>
								</AppButton>

								<div className="h-4 w-px bg-border/50" />

								<ActionButton
									icon={<Pencil />}
									label={t('imageNode.edit')}
									onClick={handleEdit}
								/>
								<ActionButton
									icon={<Trash2 />}
									label={t('imageNode.delete')}
									onClick={() => setShowDeleteConfirm(true)}
								/>
							</div>
						</AppTooltipProvider>

						{loadError || !resolvedSrc ? (
							<div className="flex h-32 w-64 items-center justify-center rounded-md border border-dashed border-border bg-muted text-sm text-muted-foreground">
								{alt ?? t('imageNode.notFound')}
							</div>
						) : (
							<img
								src={resolvedSrc}
								alt={alt ?? ''}
								title={title ?? undefined}
								onError={handleError}
								onLoad={handleLoad}
								draggable={false}
								className="block max-w-full rounded-md"
							/>
						)}
					</figure>
				</div>
			)}
		</NodeViewWrapper>
	);
}
