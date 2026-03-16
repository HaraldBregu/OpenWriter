import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Sparkles, Pencil, Trash2, Download, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppButton } from '@/components/app/AppButton';
import {
	AppTooltip,
	AppTooltipTrigger,
	AppTooltipContent,
	AppTooltipProvider,
} from '@/components/app/AppTooltip';

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
					className="bg-background/80 text-foreground backdrop-blur-sm hover:bg-accent"
				>
					{icon}
				</AppButton>
			</AppTooltipTrigger>
			<AppTooltipContent side="top" sideOffset={4}>
				<p className="text-xs">{label}</p>
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

	const handleEnhance = useCallback(() => {
		/* TODO: integrate AI enhance flow */
	}, []);

	const handleEdit = useCallback(() => {
		/* TODO: open image editor */
	}, []);

	const showToolbar = hovered && !loadError && resolvedSrc;

	return (
		<NodeViewWrapper contentEditable={false} className="my-4">
			<figure
				className="relative inline-block max-w-full rounded-md"
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
			>
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

				{/* Action toolbar */}
				<AppTooltipProvider delayDuration={300}>
					<div
						className={cn(
							'absolute right-2 top-2 z-50 flex items-center gap-1 rounded-lg border border-border bg-background/70 p-1 shadow-md backdrop-blur-md',
							'pointer-events-none opacity-0 transition-opacity duration-150',
							showToolbar && 'pointer-events-auto opacity-100'
						)}
					>
						<ActionButton
							icon={<Sparkles />}
							label={t('imageNode.enhance')}
							onClick={handleEnhance}
						/>
						<ActionButton
							icon={<Pencil />}
							label={t('imageNode.edit')}
							onClick={handleEdit}
						/>
						<ActionButton
							icon={<Copy />}
							label={t('imageNode.copy')}
							onClick={handleCopy}
						/>
						<ActionButton
							icon={<Download />}
							label={t('imageNode.download')}
							onClick={handleDownload}
						/>
						<div className="mx-0.5 h-4 w-px bg-border" />
						<ActionButton
							icon={<Trash2 />}
							label={t('imageNode.delete')}
							onClick={handleDelete}
						/>
					</div>
				</AppTooltipProvider>
			</figure>
		</NodeViewWrapper>
	);
}
