import React, {
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useEditor, EditorContent, type UseEditorOptions } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import { DOMParser as PmDOMParser, Slice } from '@tiptap/pm/model';
import { cn } from '@/lib/utils';
import { BlockControls, GUTTER_WIDTH, type HoveredBlock } from './BlockControls';
import { BlockActions } from './BlockActions';
import { BubbleMenu } from './bubble_menu';
import { OptionMenu } from './option_menu';

import { markdownToTiptapJSON, tiptapDocToMarkdown } from './markdown';
import { createExtensions } from './extensions';
import { EditorProvider } from './EditorContext';

export interface ImageInsertOptions {
	src: string;
	alt?: string;
	title?: string;
}

export interface TextEditorElement extends HTMLDivElement {
	insertText: (text: string, options?: { preventEditorUpdate?: boolean }) => void;
	insertMarkdown: (
		markdown: string,
		options?: { from?: number; preventEditorUpdate?: boolean }
	) => void;
	insertImage: (options: ImageInsertOptions) => void;
	setSearch: (query: string) => void;
	clearSearch: () => void;
	removeAgentPrompt: () => void;
	setAgentPromptLoading: (loading: boolean) => void;
	setAgentPromptEnable: (enable: boolean) => void;
}

export interface TextEditorProps {
	value: string;
	onChange: (value: string) => void;
	autoFocus?: boolean;
	className?: string;
	disabled?: boolean;
	id?: string;
	streamingContent?: string;
	onContinueWithAssistant?: (before: string, after: string, cursorPos: number) => void;
	onEnhanceWithAssistant?: (selectedText: string, from: number, to: number) => void;
	onAgentPromptSubmit?: (before: string, after: string, cursorPos: number, prompt: string) => void;
}

const TextEditor = React.memo(
	React.forwardRef<TextEditorElement, TextEditorProps>(
		(
			{
				value,
				onChange,
				autoFocus,
				className,
				disabled,
				id,
				streamingContent,
				onContinueWithAssistant,
				onAgentPromptSubmit,
			},
			ref
		) => {
			const onChangeRef = useRef(onChange);
			onChangeRef.current = onChange;

			const onAgentPromptSubmitRef = useRef(onAgentPromptSubmit);
			onAgentPromptSubmitRef.current = onAgentPromptSubmit;

			const extensions = useMemo(
				() =>
					createExtensions({
						onAgentPromptSubmit: (before, after, cursorPos, prompt) =>
							onAgentPromptSubmitRef.current?.(before, after, cursorPos, prompt),
					}),
				[]
			);

			const lastEmittedRef = useRef<string>('');
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
					onCreate: ({ editor: ed }: { editor: Editor }) => {
						const initial = initialValueRef.current;
						if (!initial) return;
						const doc = markdownToTiptapJSON(ed.schema, initial);
						if (doc) {
							ed.commands.setContent(doc.toJSON(), { emitUpdate: false });
						}
					},
					onUpdate: ({ editor: ed, transaction }: { editor: Editor; transaction: any }) => {
						if (transaction.getMeta('preventEditorUpdate')) return;
						if (emitTimerRef.current) clearTimeout(emitTimerRef.current);
						emitTimerRef.current = setTimeout(() => {
							const md = tiptapDocToMarkdown(ed.state.doc);
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

			const rootRef = useRef<HTMLDivElement>(null);

			useImperativeHandle(ref, () => {
				const el = rootRef.current!;
				return Object.assign(el, {
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
					insertMarkdown(
						markdown: string,
						options: { from?: number; preventEditorUpdate?: boolean } = {}
					) {
						if (!editor || editor.isDestroyed) return;
						const from = options.from ?? editor.state.selection.from;
						const to = editor.state.doc.content.size;

						const storage = editor.storage as unknown as Record<string, Record<string, unknown>>;
						const mdParser = storage.markdown?.parser as
							| {
									parse: (content: string, options?: { inline?: boolean }) => string;
							  }
							| undefined;
						if (!mdParser) return;
						const html = mdParser.parse(markdown, { inline: false });
						if (!html) return;

						const tempEl = document.createElement('div');
						tempEl.innerHTML = html;
						const parsed = PmDOMParser.fromSchema(editor.schema).parse(tempEl);
						const slice = new Slice(parsed.content, 0, 0);

						const tr = editor.state.tr
							.replace(from, to, slice)
							.setMeta('preventEditorUpdate', options.preventEditorUpdate ?? false);
						editor.view.dispatch(tr);
					},
					insertImage(options: ImageInsertOptions) {
						if (!editor || editor.isDestroyed) return;
						editor.commands.setImage({
							src: options.src,
							alt: options.alt,
							title: options.title,
						});
					},
					setSearch(query: string) {
						if (!editor || editor.isDestroyed) return;
						editor.commands.setSearch(query);
					},
					clearSearch() {
						if (!editor || editor.isDestroyed) return;
						editor.commands.clearSearch();
					},
					removeAgentPrompt() {
						if (!editor || editor.isDestroyed) return;
						const { doc } = editor.state;
						doc.descendants((node, pos) => {
							if (node.type.name === 'agentPrompt') {
								editor
									.chain()
									.deleteRange({ from: pos, to: pos + node.nodeSize })
									.run();
								return false;
							}
							return true;
						});
					},
					setAgentPromptLoading(loading: boolean) {
						if (!editor || editor.isDestroyed) return;
						const { doc, tr } = editor.state;
						doc.descendants((node, pos) => {
							if (node.type.name === 'agentPrompt') {
								tr.setNodeMarkup(pos, undefined, { ...node.attrs, loading });
								return false;
							}
							return true;
						});
						editor.view.dispatch(tr);
					},
					setAgentPromptEnable(enable: boolean) {
						if (!editor || editor.isDestroyed) return;
						const { doc, tr } = editor.state;
						doc.descendants((node, pos) => {
							if (node.type.name === 'agentPrompt') {
								tr.setNodeMarkup(pos, undefined, { ...node.attrs, enable });
								return false;
							}
							return true;
						});
						editor.view.dispatch(tr);
					},
				}) as TextEditorElement;
			}, [editor]);

			useEffect(() => {
				if (!editor || editor.isDestroyed) return;

				if (streamingContent !== undefined) {
					const doc = markdownToTiptapJSON(editor.schema, streamingContent);
					const current = tiptapDocToMarkdown(editor.state.doc);
					if (current !== streamingContent) {
						if (doc) {
							editor.commands.setContent(doc.toJSON(), {
								emitUpdate: false,
								parseOptions: { preserveWhitespace: 'full' },
							});
						} else {
							editor.commands.setContent('', { emitUpdate: false });
						}
					}
					return;
				}

				if (value === lastEmittedRef.current) {
					return;
				}

				const current = tiptapDocToMarkdown(editor.state.doc);
				const incoming = value || '';
				if (current !== incoming) {
					const doc = markdownToTiptapJSON(editor.schema, incoming);
					if (doc) {
						editor.commands.setContent(doc.toJSON(), {
							emitUpdate: false,
							parseOptions: { preserveWhitespace: 'full' },
						});
					} else {
						editor.commands.setContent('', { emitUpdate: false });
					}
				}
			}, [value, streamingContent, editor]);

			useEffect(() => {
				if (!editor || editor.isDestroyed) return;
				editor.setEditable(!disabled);
			}, [editor, disabled]);

			const didAutoFocus = useRef(false);
			useEffect(() => {
				if (didAutoFocus.current || !autoFocus || !editor || editor.isDestroyed) return;
				didAutoFocus.current = true;
				Promise.resolve().then(() => {
					if (!editor.isDestroyed) editor.commands.focus('start');
				});
			}, [editor, autoFocus]);

			const containerRef = useRef<HTMLDivElement>(null);
			const [hoveredBlock, setHoveredBlock] = useState<HoveredBlock | null>(null);

			const getBlock = useCallback(
				(y: number): { dom: HTMLElement; pos: number } | null => {
					if (!editor) return null;
					const pm = containerRef.current?.querySelector('.ProseMirror') as HTMLElement | null;
					if (!pm) return null;
					for (const child of Array.from(pm.children) as HTMLElement[]) {
						const r = child.getBoundingClientRect();
						if (y >= r.top - 4 && y <= r.bottom + 4) {
							try {
								const p = editor.view.posAtDOM(child, 0);
								const pos = editor.state.doc.resolve(p).before(1);
								const node = editor.state.doc.nodeAt(pos);
								// Skip transient UI-only nodes (not part of markdown output).
								if (node && node.type.name === 'agentPrompt') return null;
								return { dom: child, pos };
							} catch {
								return null;
							}
						}
					}
					return null;
				},
				[editor]
			);

			useEffect(() => {
				const el = containerRef.current;
				if (!el) return;

				const onMove = (e: MouseEvent): void => {
					const block = getBlock(e.clientY);
					if (block) {
						const cR = el.getBoundingClientRect();
						const bR = block.dom.getBoundingClientRect();
						const lh = parseFloat(getComputedStyle(block.dom).lineHeight) || 30;
						setHoveredBlock({
							node: block.dom,
							pos: block.pos,
							top: bR.top - cR.top + Math.min(lh, bR.height) / 2 - 12,
						});
					} else {
						setHoveredBlock(null);
					}
				};

				const onLeave = (): void => {
					setTimeout(() => {
						setHoveredBlock(null);
					}, 80);
				};

				el.addEventListener('mousemove', onMove);
				el.addEventListener('mouseleave', onLeave);
				return () => {
					el.removeEventListener('mousemove', onMove);
					el.removeEventListener('mouseleave', onLeave);
				};
			}, [getBlock]);

			return (
				<div id={id} className={cn('w-full', className)}>
					<div className="relative w-full" ref={rootRef}>
						<div
							ref={containerRef}
							className="relative"
							style={{ paddingLeft: GUTTER_WIDTH, paddingRight: GUTTER_WIDTH }}
						>
							{editor && (
								<EditorProvider editor={editor}>
									<BlockControls containerRef={containerRef} hoveredBlock={hoveredBlock} />
									<BlockActions containerRef={containerRef} hoveredBlock={hoveredBlock} />
									<BubbleMenu onEnhanceWithAssistant={onEnhanceWithAssistant} />
									<OptionMenu onContinueWithAssistant={onContinueWithAssistant} />
								</EditorProvider>
							)}
							<EditorContent editor={editor} />
						</div>
					</div>
				</div>
			);
		}
	)
);
TextEditor.displayName = 'TextEditor';

export { TextEditor };
