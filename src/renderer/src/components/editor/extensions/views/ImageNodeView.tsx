import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import type { ImageExtensionOptions } from '../image-extension';

interface ImageAttrs {
	src: string | null;
	alt: string | null;
	title: string | null;
	width: number | null;
	height: number | null;
}

const MIN_WIDTH = 80;

const ABSOLUTE_URL_RE = /^(?:https?:\/\/|data:|file:\/\/|blob:|local-resource:\/\/)/i;

/**
 * Resolve a potentially relative image src to a displayable URL.
 * Relative filenames are served through the local-resource:// protocol
 * which the main process maps to the filesystem.
 */
function resolveImageSrc(src: string | null, basePath: string | null): string | null {
	if (!src) return null;
	if (ABSOLUTE_URL_RE.test(src)) return src;
	if (!basePath) return src;
	return `local-resource://${basePath}/${src}`;
}

export function ImageNodeView({
	node,
	selected,
	updateAttributes,
	extension,
}: NodeViewProps): React.JSX.Element {
	const { t } = useTranslation();
	const { src, alt, title, width, height } = node.attrs as ImageAttrs;
	const { basePath } = extension.options as ImageExtensionOptions;
	const resolvedSrc = useMemo(() => resolveImageSrc(src, basePath), [src, basePath]);

	const [loadError, setLoadError] = useState(false);
	const [resizing, setResizing] = useState(false);
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
		[updateAttributes]
	);

	const imgStyle: React.CSSProperties = {
		width: width ? `${width}px` : undefined,
		height: height ? `${height}px` : 'auto',
	};

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
