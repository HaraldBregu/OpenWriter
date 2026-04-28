import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useEditor, EditorContent, type UseEditorOptions } from '@tiptap/react';
import type { Editor as TiptapEditor } from '@tiptap/core';
import { Slice } from '@tiptap/pm/model';
import { Transaction } from '@tiptap/pm/state';

import { createExtensions } from './extensions/extensions';
import { BubbleMenu } from './components/BubbleMenu';
import { OptionMenu } from './components/OptionMenu';
import Layout from './Layout';
import type { PromptSubmitPayload } from './types';

export interface EditorElement extends HTMLDivElement {
	setContent: (markdown: string, options?: { preventEditorUpdate?: boolean }) => void;
	insertText: (text: string, options?: { preventEditorUpdate?: boolean }) => void;
	deleteText: (from: number, to: number, options?: { preventEditorUpdate?: boolean }) => void;
	insertMarkdown: (
		markdown: string,
		options?: { from?: number; preventEditorUpdate?: boolean }
	) => void;
	insertMarkdownText: (
		markdown: string,
		options?: { from?: number; to?: number; preventEditorUpdate?: boolean }
	) => void;
	setSearch: (query: string) => void;
	clearSearch: () => void;
	removeAssistant: () => void;
	setAssistantLoading: (loading: boolean) => void;
	setAssistantEnable: (enable: boolean) => void;
	setPromptStatusBar: (state: { visible: boolean; message?: string }) => void;
	clearPromptInput: () => void;
	insertPromptView: () => void;
	splitBlock: () => void;
	setHeading: (level: 1 | 2 | 3 | 4 | 5 | 6) => void;
	ensureBulletList: () => void;
	ensureOrderedList: () => void;
	exitList: () => void;
}

export interface EditorProps {
	value: string;
	onChange: (value: string) => void;
	onSelectionChange?: (selection: { from: number; to: number } | null) => void;
	externalValueVersion?: number;
	autoFocus?: boolean;
	className?: string;
	disabled?: boolean;
	id?: string;
	streamingContent?: string;
	onPromptSubmit?: (payload: PromptSubmitPayload) => void;
	onInsertContent?: () => void;
	/** Called when the TipTap editor instance becomes available or is destroyed. */
	onEditorReady?: (editor: TiptapEditor | null) => void;
}

function Content({
	onAiAction,
}: {
	onAiAction?: (payload: PromptSubmitPayload) => void;
}): React.JSX.Element {
	return (
		<>
			<BubbleMenu onAiAction={onAiAction} />
			<OptionMenu />
		</>
	);
}

const Editor = React.memo(
	React.forwardRef<EditorElement, EditorProps>(
		(
			{
				value,
				onChange,
				onSelectionChange,
				externalValueVersion = 0,
				autoFocus,
				className,
				disabled,
				id,
				streamingContent,
				onPromptSubmit,
				onInsertContent,
				onEditorReady,
			},
			ref
		) => {
			const onChangeRef = useRef(onChange);
			const onSelectionChangeRef = useRef(onSelectionChange);
			const onPromptSubmitRef = useRef(onPromptSubmit);
			const onEditorReadyRef = useRef(onEditorReady);

			useEffect(() => {
				onChangeRef.current = onChange;
				onSelectionChangeRef.current = onSelectionChange;
				onPromptSubmitRef.current = onPromptSubmit;
				onEditorReadyRef.current = onEditorReady;
			});

			const extensions = useMemo(
				() =>
					createExtensions({
						onPromptSubmit: (payload) => onPromptSubmitRef.current?.(payload),
						onImageInsert: () => undefined,
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
						queueMicrotask(() => {
							if (ed.isDestroyed) return;
							console.log('[Editor] setContent (onCreate initial)', initial);
							ed.commands.setContent(initial, {
								emitUpdate: false,
								contentType: 'markdown',
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
							const md = ed.getMarkdown();
							lastEmittedRef.current = md;
							onChangeRef.current(md);
						}, 100);
					},
					editorProps: {
						attributes: {
							class:
								'focus:outline-none min-h-[120px] py-2 text-base leading-relaxed text-foreground break-words [&_p]:mb-4 [&_p:last-child]:mb-0 [&_hr]:my-4 [&_hr]:border-border',
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
						markdown: string,
						options: { preventEditorUpdate?: boolean } = {
							preventEditorUpdate: false,
						}
					) {
						if (!editor || editor.isDestroyed) return;
						console.log('[Editor] setContent (imperative)', markdown, options);
						editor.commands.setContent(markdown, {
							emitUpdate: !(options.preventEditorUpdate ?? false),
							contentType: 'markdown',
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
					insertMarkdown(
						markdown: string,
						options: { from?: number; preventEditorUpdate?: boolean } = {}
					) {
						if (!editor || editor.isDestroyed) return;
						const from = options.from ?? editor.state.selection.from;
						const to = editor.state.doc.content.size;

						const json = editor.markdown?.parse(markdown);
						if (!json) return;

						const doc = editor.schema.nodeFromJSON(json);
						const slice = new Slice(doc.content, 0, 0);

						const tr = editor.state.tr
							.replace(from, to, slice)
							.setMeta('preventEditorUpdate', options.preventEditorUpdate ?? false);
						editor.view.dispatch(tr);
					},
					insertMarkdownText(
						markdown: string,
						options: { from?: number; to?: number; preventEditorUpdate?: boolean } = {}
					) {
						if (!editor || editor.isDestroyed) return;
						const from = options.from ?? editor.state.selection.from;
						const to = options.to ?? from;

						const json = editor.markdown?.parse(markdown);
						if (!json) return;

						const doc = editor.schema.nodeFromJSON(json);
						const slice = new Slice(doc.content, 0, 0);

						const tr = editor.state.tr
							.replaceRange(from, to, slice)
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
						const { doc } = editor.state;
						doc.descendants((node, pos) => {
							if (node.type.name === 'contentGenerator') {
								editor
									.chain()
									.deleteRange({ from: pos, to: pos + node.nodeSize })
									.run();
								return false;
							}
							return true;
						});
					},
					setAssistantLoading(loading: boolean) {
						if (!editor || editor.isDestroyed) return;
						const { doc, tr } = editor.state;
						doc.descendants((node, pos) => {
							if (node.type.name === 'contentGenerator') {
								tr.setNodeMarkup(pos, undefined, { ...node.attrs, loading });
								return false;
							}
							return true;
						});
						editor.view.dispatch(tr);
					},
					setAssistantEnable(enable: boolean) {
						if (!editor || editor.isDestroyed) return;
						const { doc, tr } = editor.state;
						doc.descendants((node, pos) => {
							if (node.type.name === 'contentGenerator') {
								tr.setNodeMarkup(pos, undefined, { ...node.attrs, enable });
								return false;
							}
							return true;
						});
						editor.view.dispatch(tr);
					},
					setPromptStatusBar({ visible, message }) {
						if (!editor || editor.isDestroyed) return;
						const { doc, tr } = editor.state;
						doc.descendants((node, pos) => {
							if (node.type.name === 'contentGenerator') {
								tr.setNodeMarkup(pos, undefined, {
									...node.attrs,
									statusBarVisible: visible,
									statusBarMessage: message ?? node.attrs.statusBarMessage,
								});
								return false;
							}
							return true;
						});
						editor.view.dispatch(tr);
					},
					clearPromptInput() {
						if (!editor || editor.isDestroyed) return;
						const { doc, tr } = editor.state;
						doc.descendants((node, pos) => {
							if (node.type.name === 'contentGenerator') {
								tr.setNodeMarkup(pos, undefined, { ...node.attrs, prompt: '' });
								return false;
							}
							return true;
						});
						editor.view.dispatch(tr.setMeta('preventEditorUpdate', true));
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

				if (streamingContent !== undefined) {
					const current = editor.getMarkdown();
					if (current !== streamingContent) {
						queueMicrotask(() => {
							if (editor.isDestroyed) return;
							editor.commands.setContent(streamingContent || '', {
								emitUpdate: false,
								contentType: 'markdown',
							});
						});
					}
					return;
				}

				const hasExternalValueVersionChanged =
					lastExternalValueVersionRef.current !== externalValueVersion;

				if (!hasExternalValueVersionChanged && value === lastEmittedRef.current) {
					return;
				}
				lastExternalValueVersionRef.current = externalValueVersion;

				const current = editor.getMarkdown();
				const incoming = value || '';
				if (current !== incoming) {
					queueMicrotask(() => {
						if (editor.isDestroyed) return;
						editor.commands.setContent(incoming, {
							emitUpdate: false,
							contentType: 'markdown',
						});
					});
				}
			}, [value, streamingContent, editor, externalValueVersion]);

			useEffect(() => {
				if (!editor || editor.isDestroyed) return;
				editor.setEditable(!disabled);
			}, [editor, disabled]);

			const autoFocusedEditorRef = useRef<TiptapEditor | null>(null);
			useEffect(() => {
				if (!autoFocus || !editor || editor.isDestroyed) return;
				if (autoFocusedEditorRef.current === editor) return;
				autoFocusedEditorRef.current = editor;
				Promise.resolve().then(() => {
					if (!editor.isDestroyed) editor.commands.focus('start');
				});
			}, [editor, autoFocus]);

			const handleAiAction = useCallback((payload: PromptSubmitPayload) => {
				onPromptSubmitRef.current?.(payload);
			}, []);

			return (
				<Layout
					id={id}
					className={className}
					ref={rootRef}
					editor={editor}
					onInsertContent={onInsertContent}
				>
					{editor && <Content onAiAction={handleAiAction} />}
					<EditorContent editor={editor} />
				</Layout>
			);
		}
	)
);
Editor.displayName = 'Editor';

export { Editor };
