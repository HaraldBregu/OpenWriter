import React, { useCallback, useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';

interface ImageAttrs {
	src: string | null;
	alt: string | null;
	title: string | null;
	width: number | null;
	height: number | null;
}

const MIN_WIDTH = 80;

export function ImageNodeView({
	node,
	selected,
	updateAttributes,
}: NodeViewProps): React.JSX.Element {
	const { src, alt, title, width, height } = node.attrs as ImageAttrs;

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
				{loadError || !src ? (
					<div className="flex h-32 w-64 items-center justify-center rounded-md border border-dashed border-border bg-muted text-sm text-muted-foreground">
						{alt ?? 'Image not found'}
					</div>
				) : (
					<div className="relative inline-block">
						<img
							ref={imgRef}
							src={src}
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
