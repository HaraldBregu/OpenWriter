import React, { useCallback, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';

interface ImageAttrs {
	src: string | null;
	alt: string | null;
	title: string | null;
}

export function ImageNodeView({ node, selected }: NodeViewProps): React.JSX.Element {
	const { src, alt, title } = node.attrs as ImageAttrs;

	const [loadError, setLoadError] = useState(false);

	const handleError = useCallback(() => {
		setLoadError(true);
	}, []);

	const handleLoad = useCallback(() => {
		setLoadError(false);
	}, []);

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
					<img
						src={src}
						alt={alt ?? ''}
						title={title ?? undefined}
						onError={handleError}
						onLoad={handleLoad}
						draggable={false}
						className="block max-w-full rounded-md"
						style={{ height: 'auto' }}
					/>
				)}
				{alt && !loadError && (
					<figcaption className="mt-1 text-center text-xs italic text-muted-foreground">
						{alt}
					</figcaption>
				)}
			</figure>
		</NodeViewWrapper>
	);
}
