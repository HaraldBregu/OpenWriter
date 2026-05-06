import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useEditor, EditorContent, type UseEditorOptions } from '@tiptap/react';
import type { Content, Editor as TiptapEditor } from '@tiptap/core';
import { Transaction } from '@tiptap/pm/state';

import { createExtensions } from './extensions/extensions';
import { BubbleMenu } from './components/BubbleMenu';
import { OptionMenu } from './components/OptionMenu';
import Layout from './Layout';
import type { PromptSubmitPayload } from './types';
import type { EditorMaxWidthType, EditorFontType } from '../../../../../shared/types';

const FONT_TYPE_CLASS: Record<EditorFontType, string> = {
	default: '!font-default',
	sans: '!font-sans',
	serif: '!font-serif',
	writer: '!font-writer',
};
const FONT_TYPE_CLASS_VALUES = Object.values(FONT_TYPE_CLASS);
import { cn } from '@/lib/utils';

const EMPTY_DOC: Content = { type: 'doc', content: [{ type: 'paragraph' }] };

function parseDocOrEmpty(value: string): Content {
	if (!value) return EMPTY_DOC;
	try {
		return JSON.parse(value) as Content;
	} catch {
		return EMPTY_DOC;
	}
}

export interface EditorElement extends HTMLDivElement {
	/** Replace document content. `value` is a JSON-stringified ProseMirror doc. */
	setContent: (value: string, options?: { preventEditorUpdate?: boolean }) => void;
	insertText: (text: string, options?: { preventEditorUpdate?: boolean }) => void;
	deleteText: (from: number, to: number, options?: { preventEditorUpdate?: boolean }) => void;
	setSearch: (query: string) => void;
	clearSearch: () => void;
	removeAssistant: () => void;
	setAssistantLoading: (loading: boolean) => void;
	setAssistantEnable: (enable: boolean) => void;
	insertPromptView: () => void;
	splitBlock: () => void;
	setHeading: (level: 1 | 2 | 3 | 4 | 5 | 6) => void;
	ensureBulletList: () => void;
	ensureOrderedList: () => void;
	exitList: () => void;
}

export interface EditorProps {
	/** JSON-stringified ProseMirror doc. Empty string = empty document. */
	value: string;
	onChange: (value: string) => void;
	onSelectionChange?: (selection: { from: number; to: number } | null) => void;
	externalValueVersion?: number;
	className?: string;
	disabled?: boolean;
	id?: string;
	onReviewPromptSubmit?: (payload: PromptSubmitPayload) => void;
	onWritePromptSubmit?: (payload: PromptSubmitPayload) => void;
	onUndo?: () => void;
	onRedo?: () => void;
	/** Called when the TipTap editor instance becomes available or is destroyed. */
	onEditorReady?: (editor: TiptapEditor | null) => void;
	/** Absolute path of the folder containing the markdown source, used to resolve relative image paths. */
	documentBasePath?: string | null;
	/** Editor content max-width preset. */
	maxWidth?: EditorMaxWidthType;
	/** Editor text size as a whole-number percentage (50–300). */
	textSize?: number;
	/** Editor font preset. */
	fontType?: EditorFontType;
}

const Editor = React.memo(
	React.forwardRef<EditorElement, EditorProps>(
		(
			{
				value,
				onChange,
				onSelectionChange,
				externalValueVersion = 0,
				className,
				disabled,
				id,
				onReviewPromptSubmit,
				onWritePromptSubmit,
				onUndo,
				onRedo,
				onEditorReady,
				documentBasePath = null,
				maxWidth = 'medium',
				textSize = 100,
				fontType = 'default',
			},
			ref
		) => {
			const onChangeRef = useRef(onChange);
			const onSelectionChangeRef = useRef(onSelectionChange);
			const onReviewPromptSubmitRef = useRef(onReviewPromptSubmit);
			const onWritePromptSubmitRef = useRef(onWritePromptSubmit);
			const onUndoRef = useRef(onUndo);
			const onRedoRef = useRef(onRedo);
			const onEditorReadyRef = useRef(onEditorReady);

			useEffect(() => {
				onChangeRef.current = onChange;
				onSelectionChangeRef.current = onSelectionChange;
				onReviewPromptSubmitRef.current = onReviewPromptSubmit;
				onWritePromptSubmitRef.current = onWritePromptSubmit;
				onUndoRef.current = onUndo;
				onRedoRef.current = onRedo;
				onEditorReadyRef.current = onEditorReady;
			});

			const extensions = useMemo(
				() =>
					createExtensions({
						onPromptSubmit: (payload) => onWritePromptSubmitRef.current?.(payload),
						onImageInsert: () => undefined,
						onUndo: () => onUndoRef.current?.(),
						onRedo: () => onRedoRef.current?.(),
					}),
				[]
			);

			const lastEmittedRef = useRef<string>('');
			const lastExternalValueVersionRef = useRef(externalValueVersion);
			const emitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
			const initialValueRef = useRef(value);

			useEffect(() => {
				return () => {
					if (emitTimerRef.current) clearTimeout(emitTimerRef.current);
				};
			}, []);

			const editorOptions = useMemo<UseEditorOptions>(
				() => ({
					extensions,
					content: '',
					immediatelyRender: false,
					onCreate: ({ editor: ed }: { editor: TiptapEditor }) => {
						const initial = initialValueRef.current;
						if (!initial) return;
						lastEmittedRef.current = initial;
						const doc = parseDocOrEmpty(initial);
						requestAnimationFrame(() => {
							requestAnimationFrame(() => {
								if (ed.isDestroyed) return;
								ed.commands.setContent(doc, {
									emitUpdate: false,
								});
							});
						});
					},
					onUpdate: ({
						editor: ed,
						transaction,
					}: {
						editor: TiptapEditor;
						transaction: Transaction;
					}) => {
						if (transaction.getMeta('preventEditorUpdate')) return;
						if (emitTimerRef.current) clearTimeout(emitTimerRef.current);
						emitTimerRef.current = setTimeout(() => {
							if (ed.isDestroyed) return;
							const json = JSON.stringify(ed.state.doc.toJSON());
							lastEmittedRef.current = json;
							onChangeRef.current(json);
						}, 100);
					},
					editorProps: {
						attributes: {
							class: cn(
								'!font-default focus:outline-none min-h-[120px] py-2 text-base leading-relaxed text-foreground break-words [&_p]:mb-4 [&_p:last-child]:mb-0 [&_hr]:my-4 [&_hr]:border-border',
							)
						},
					},
				}),
				[extensions]
			);

			const editor = useEditor(editorOptions, []);

			useEffect(() => {
				if (!editor || editor.isDestroyed) return;
				onEditorReadyRef.current?.(editor);
				return () => {
					onEditorReadyRef.current?.(null);
				};
			}, [editor]);

			useEffect(() => {
				if (!editor || editor.isDestroyed) return;
				const dom = editor.view.dom as HTMLElement;
				dom.style.fontSize = `${textSize}%`;
			}, [editor, textSize]);

			useEffect(() => {
				if (!editor || editor.isDestroyed) return;
				const dom = editor.view.dom as HTMLElement;
				dom.classList.remove(...FONT_TYPE_CLASS_VALUES);
				dom.classList.add(FONT_TYPE_CLASS[fontType]);
			}, [editor, fontType]);

			useEffect(() => {
				if (!editor || editor.isDestroyed) return;

				const emitSelection = (): void => {
					const { from, to } = editor.state.selection;
					onSelectionChangeRef.current?.({ from, to });
				};

				emitSelection();
				editor.on('selectionUpdate', emitSelection);

				return () => {
					editor.off('selectionUpdate', emitSelection);
				};
			}, [editor]);

			const rootRef = useRef<HTMLDivElement>(null);

			useImperativeHandle(ref, () => {
				const el = rootRef.current!;
				return Object.assign(el, {
					setContent(
						value: string,
						options: { preventEditorUpdate?: boolean } = {
							preventEditorUpdate: false,
						}
					) {
						if (!editor || editor.isDestroyed) return;
						editor.commands.setContent(parseDocOrEmpty(value), {
							emitUpdate: !(options.preventEditorUpdate ?? false),
						});
					},
					insertText(
						text: string,
						options: { preventEditorUpdate: boolean } = {
							preventEditorUpdate: false,
						}
					) {
						if (!editor || editor.isDestroyed) return;
						const { from } = editor.state.selection;

						const tr = editor.state.tr
							.insertText(text, from)
							.setMeta('preventEditorUpdate', options?.preventEditorUpdate);
						editor.view.dispatch(tr);
					},
					deleteText(from: number, to: number, options: { preventEditorUpdate?: boolean } = {}) {
						if (!editor || editor.isDestroyed) return;

						const tr = editor.state.tr
							.delete(from, to)
							.setMeta('preventEditorUpdate', options.preventEditorUpdate ?? false);
						editor.view.dispatch(tr);
					},
					setSearch(query: string) {
						if (!editor || editor.isDestroyed) return;
						editor.commands.setSearch(query);
					},
					clearSearch() {
						if (!editor || editor.isDestroyed) return;
						editor.commands.clearSearch();
					},
					removeAssistant() {
						if (!editor || editor.isDestroyed) return;
						editor.commands.removePromptView();
					},
					setAssistantLoading(loading: boolean) {
						if (!editor || editor.isDestroyed) return;
						editor.commands.setPromptViewState({ loading });
					},
					setAssistantEnable(enable: boolean) {
						if (!editor || editor.isDestroyed) return;
						editor.commands.setPromptViewState({ enable });
					},
					insertPromptView() {
						if (!editor || editor.isDestroyed) return;
						const endPos = editor.state.doc.content.size;
						editor.chain().focus(endPos).insertPromptView().run();
					},
					splitBlock() {
						if (!editor || editor.isDestroyed) return;
						editor.commands.splitBlock();
					},
					setHeading(level: 1 | 2 | 3 | 4 | 5 | 6) {
						if (!editor || editor.isDestroyed) return;
						editor.commands.setHeading({ level });
					},
					ensureBulletList() {
						if (!editor || editor.isDestroyed) return;
						if (!editor.isActive('bulletList')) {
							editor.commands.toggleBulletList();
						}
					},
					ensureOrderedList() {
						if (!editor || editor.isDestroyed) return;
						if (!editor.isActive('orderedList')) {
							editor.commands.toggleOrderedList();
						}
					},
					exitList() {
						if (!editor || editor.isDestroyed) return;
						if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
							editor.commands.liftListItem('listItem');
						}
					},
				}) as EditorElement;
			}, [editor]);

			useEffect(() => {
				if (!editor || editor.isDestroyed) return;

				const hasExternalValueVersionChanged =
					lastExternalValueVersionRef.current !== externalValueVersion;

				if (!hasExternalValueVersionChanged && value === lastEmittedRef.current) {
					return;
				}
				lastExternalValueVersionRef.current = externalValueVersion;

				lastEmittedRef.current = value;
				const doc = parseDocOrEmpty(value);
				queueMicrotask(() => {
					if (editor.isDestroyed) return;
					editor.commands.setContent(doc, {
						emitUpdate: false,
					});
				});
			}, [value, editor, externalValueVersion]);

			useEffect(() => {
				if (!editor || editor.isDestroyed) return;
				editor.setEditable(!disabled);
			}, [editor, disabled]);

			useEffect(() => {
				if (!editor || editor.isDestroyed) return;
				const storage = editor.storage as unknown as Record<string, Record<string, unknown>>;
				if (storage.image) storage.image.documentBasePath = documentBasePath;
			}, [editor, documentBasePath]);

			const handleAiAction = useCallback((payload: PromptSubmitPayload) => {
				onReviewPromptSubmitRef.current?.(payload);
			}, []);

			return (
				<Layout
					id={id}
					className={className}
					ref={rootRef}
					editor={editor}
					maxWidth={maxWidth}
				>
					{editor && (
						<>
							<BubbleMenu onPromptSubmit={handleAiAction} />
							<OptionMenu />
						</>
					)}
					<EditorContent editor={editor} />
				</Layout>
			);
		}
	)
);
Editor.displayName = 'Editor';

export { Editor };
