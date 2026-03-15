import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';

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
	return `local-resource://localhost${documentBasePath}/${src}`;
}

export function ImageNodeView({ node, editor }: NodeViewProps): React.JSX.Element {
	const { t } = useTranslation();
	const { src, alt, title } = node.attrs as ImageAttrs;
	const storage = editor.storage as unknown as Record<string, Record<string, unknown>>;
	const documentBasePath = (storage.image?.documentBasePath as string) ?? null;
	const resolvedSrc = useMemo(
		() => resolveImageSrc(src, documentBasePath),
		[src, documentBasePath]
	);

	const [loadError, setLoadError] = useState(false);
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

	return (
		<NodeViewWrapper contentEditable={false} className="my-4">
			<figure className="relative inline-block max-w-full rounded-md">
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
		</NodeViewWrapper>
	);
}
