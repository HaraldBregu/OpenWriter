import React, { useEffect, useMemo, useReducer, useRef } from 'react';
import type { NodeViewProps } from '@tiptap/react';
import { ImageContext } from './context/context';
import type { ImageContextValue } from './context/context';
import { imageReducer } from './context/reducer';
import type { ImageState } from './context/state';
import { useImageActions } from './hooks/use-image-actions';

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

interface ProviderProps {
	nodeViewProps: NodeViewProps;
	children: React.ReactNode;
}

export function Provider({ nodeViewProps, children }: ProviderProps): React.JSX.Element {
	const { editor, node, getPos } = nodeViewProps;
	const { src, alt, title } = node.attrs as ImageAttrs;
	const storage = editor.storage as unknown as Record<string, Record<string, unknown>>;
	const documentBasePath = (storage.image?.documentBasePath as string) ?? null;

	const resolvedSrc = useMemo(
		() => resolveImageSrc(src, documentBasePath),
		[src, documentBasePath]
	);

	const [state, dispatch] = useReducer(
		imageReducer,
		undefined,
		(): ImageState => ({
			loadError: false,
			hovered: false,
			focused: false,
			editing: false,
			editInitialMode: undefined,
			previewing: false,
		})
	);

	const prevSrcRef = useRef(resolvedSrc);
	useEffect(() => {
		if (prevSrcRef.current !== resolvedSrc) {
			prevSrcRef.current = resolvedSrc;
			dispatch({ type: 'RESET_LOAD_ERROR' });
		}
	}, [resolvedSrc]);

	const actions = useImageActions({ dispatch, editor, node, getPos });

	const showToolbar = (state.hovered || state.focused) && !state.loadError && !!resolvedSrc;

	const value = useMemo<ImageContextValue>(
		() => ({
			state,
			resolvedSrc,
			alt,
			title,
			showToolbar,
			...actions,
		}),
		[state, resolvedSrc, alt, title, showToolbar, actions]
	);

	return <ImageContext.Provider value={value}>{children}</ImageContext.Provider>;
}
