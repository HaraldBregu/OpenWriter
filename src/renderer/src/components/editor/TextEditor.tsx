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
import { Slice } from '@tiptap/pm/model';
import { Transaction } from '@tiptap/pm/state';
import { cn } from '@/lib/utils';
import { BlockControls, GUTTER_WIDTH, type HoveredBlock } from './BlockControls';
import { BlockActions } from './BlockActions';
import { BubbleMenu } from './bubble_menu';
import { OptionMenu } from './option_menu';
import { InsertImageDialog } from './InsertImageDialog';

import { createExtensions } from './extensions';
import type { AssistantAgentId } from './extensions/assistant';
import { type ImageInsertHandler } from './extensions/image';
import { EditorProvider } from './EditorContext';

export interface ImageInsertOptions {
	src: string;
	alt?: string;
	title?: string;
}

export interface TextEditorElement extends HTMLDivElement {
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
	insertImage: (options: ImageInsertOptions) => void;
	setSearch: (query: string) => void;
	clearSearch: () => void;
	removeAssistant: () => void;
	setAssistantLoading: (loading: boolean) => void;
	setAssistantEnable: (enable: boolean) => void;
	splitBlock: () => void;
	setHeading: (level: 1 | 2 | 3 | 4 | 5 | 6) => void;
	ensureBulletList: () => void;
	ensureOrderedList: () => void;
	exitList: () => void;
}

export interface TextEditorProps {
	value: string;
	onChange: (value: string) => void;
	onSelectionChange?: (selection: { from: number; to: number } | null) => void;
	externalValueVersion?: number;
	autoFocus?: boolean;
	className?: string;
	disabled?: boolean;
	id?: string;
	streamingContent?: string;
	onContinueWithAssistant?: (
		before: string,
		after: string,
		cursorPos: number,
		closeMenu: () => void
	) => void;
	onGenerateTextSubmit?: (
		before: string,
		after: string,
		cursorPos: number,
		prompt: string
	) => void;
	onGenerateImageSubmit?: (
		before: string,
		after: string,
		cursorPos: number,
		prompt: string,
		files: File[]
	) => void;
	/** Document UUID — needed to save image files into the document folder. */
	documentId?: string;
	/** Called when the TipTap editor instance becomes available or is destroyed. */
	onEditorReady?: (editor: Editor | null) => void;
	onUndo?: () => void;
	onRedo?: () => void;
}

function readFileAsDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (): void => resolve(reader.result as string);
		reader.onerror = (): void => reject(new Error(`FileReader failed for ${file.name}`));
		reader.readAsDataURL(file);
	});
}

const TextEditor = React.memo(
	React.forwardRef<TextEditorElement, TextEditorProps>(
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
				onContinueWithAssistant,
				onGenerateTextSubmit,
				onGenerateImageSubmit,
				documentId,
				onEditorReady,
				onUndo,
				onRedo,
			},
			ref
		) => {
			const onChangeRef = useRef(onChange);
			onChangeRef.current = onChange;

			const onSelectionChangeRef = useRef(onSelectionChange);
			onSelectionChangeRef.current = onSelectionChange;

			const onGenerateTextSubmitRef = useRef(onGenerateTextSubmit);
			onGenerateTextSubmitRef.current = onGenerateTextSubmit;

			const onGenerateImageSubmitRef = useRef(onGenerateImageSubmit);
			onGenerateImageSubmitRef.current = onGenerateImageSubmit;

			const documentIdRef = useRef(documentId);
			documentIdRef.current = documentId;

			const onEditorReadyRef = useRef(onEditorReady);
			onEditorReadyRef.current = onEditorReady;

			const onUndoRef = useRef(onUndo);
			onUndoRef.current = onUndo;

			const onRedoRef = useRef(onRedo);
			onRedoRef.current = onRedo;

			// Stable ref used by the extensions useMemo (which runs once).
			// Updated after editor is initialised so it always points at the
			// latest handler that has access to the live editor instance.
			const handleImageFileInsertRef = useRef<ImageInsertHandler>(() => undefined);

			const extensions = useMemo(
				() =>
					createExtensions({
						onGenerateTextSubmit: (before, after, cursorPos, prompt) =>
							onGenerateTextSubmitRef.current?.(before, after, cursorPos, prompt),
						onGenerateImageSubmit: (before, after, cursorPos, prompt, files) =>
							onGenerateImageSubmitRef.current?.(before, after, cursorPos, prompt, files),
						onImageInsert: (file, insertAtPos) =>
							handleImageFileInsertRef.current(file, insertAtPos),
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
					onCreate: ({ editor: ed }: { editor: Editor }) => {
						const initial = initialValueRef.current;
						if (!initial) return;
						ed.commands.setContent(initial, {
							emitUpdate: false,
							contentType: 'markdown',
						});
					},
					onUpdate: ({ editor: ed, transaction }: { editor: Editor; transaction: Transaction }) => {
						if (transaction.getMeta('preventEditorUpdate')) return;
						if (emitTimerRef.current) clearTimeout(emitTimerRef.current);
						emitTimerRef.current = setTimeout(() => {
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

			// Notify the parent when the editor instance becomes available.
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
					onSelectionChangeRef.current?.(null);
				};
			}, [editor]);

			// Keep the image-insert ref pointing at a callback that closes over
			// the live editor instance. This is updated every time editor changes
			// so the handler is always fresh, while extensions only need the ref.
			const handleImageFileInsert = useCallback(
				(file: File, _insertAtPos: number | null): void => {
					if (!editor || editor.isDestroyed) return;

					readFileAsDataUri(file)
						.then(async (dataUri) => {
							if (!editor || editor.isDestroyed) return;

							let imageSrc = dataUri;
							const currentDocumentId = documentIdRef.current;

							if (currentDocumentId && imageSrc.startsWith('data:')) {
								const match = imageSrc.match(/^data:image\/(\w+);base64,(.+)$/);
								if (match) {
									const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
									const base64 = match[2];
									const fileName = `${crypto.randomUUID()}.${ext}`;
									await window.workspace.saveDocumentImage({
										documentId: currentDocumentId,
										fileName,
										base64,
									});
									imageSrc = `images/${fileName}`;
								}
							}

							editor.commands.setImage({ src: imageSrc, alt: file.name });
						})
						.catch((err: unknown) => {
							console.error('[TextEditor] Failed to process dropped/pasted image:', err);
						});
				},
				[editor]
			);
			handleImageFileInsertRef.current = handleImageFileInsert;

			// Save an edited image to the document's images/ directory and
			// return the relative path. Falls back to the data URI when no
			// documentId is available.
			const handleImageEditSave = useCallback(async (dataUri: string): Promise<string> => {
				const currentDocumentId = documentIdRef.current;
				if (currentDocumentId && dataUri.startsWith('data:')) {
					const match = dataUri.match(/^data:image\/(\w+);base64,(.+)$/);
					if (match) {
						const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
						const base64 = match[2];
						const fileName = `${crypto.randomUUID()}.${ext}`;
						await window.workspace.saveDocumentImage({
							documentId: currentDocumentId,
							fileName,
							base64,
						});
						return `images/${fileName}`;
					}
				}
				return dataUri;
			}, []);

			useEffect(() => {
				if (!editor || editor.isDestroyed) return;
				const imgStorage = editor.storage as unknown as Record<string, Record<string, unknown>>;
				imgStorage.image.onImageEditSave = handleImageEditSave;
			}, [editor, handleImageEditSave]);

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
					removeAssistant() {
						if (!editor || editor.isDestroyed) return;
						const { doc } = editor.state;
						doc.descendants((node, pos) => {
							if (node.type.name === 'assistant') {
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
							if (node.type.name === 'assistant') {
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
							if (node.type.name === 'assistant') {
								tr.setNodeMarkup(pos, undefined, { ...node.attrs, enable });
								return false;
							}
							return true;
						});
						editor.view.dispatch(tr);
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
				}) as TextEditorElement;
			}, [editor]);

			useEffect(() => {
				if (!editor || editor.isDestroyed) return;

				const hasExternalValueVersionChanged =
					lastExternalValueVersionRef.current !== externalValueVersion;
				lastExternalValueVersionRef.current = externalValueVersion;

				if (streamingContent !== undefined) {
					const current = editor.getMarkdown();
					if (current !== streamingContent) {
						editor.commands.setContent(streamingContent || '', {
							emitUpdate: false,
							contentType: 'markdown',
						});
					}
					return;
				}

				if (!hasExternalValueVersionChanged && value === lastEmittedRef.current) {
					return;
				}

				const current = editor.getMarkdown();
				const incoming = value || '';
				if (current !== incoming) {
					editor.commands.setContent(incoming, {
						emitUpdate: false,
						contentType: 'markdown',
					});
				}
			}, [value, streamingContent, editor, externalValueVersion]);

			useEffect(() => {
				if (!editor || editor.isDestroyed) return;
				editor.setEditable(!disabled);
			}, [editor, disabled]);

			useEffect(() => {
				if (!editor || editor.isDestroyed || !documentId) return;
				let cancelled = false;
				window.workspace.getCurrent().then((workspacePath) => {
					if (cancelled || editor.isDestroyed || !workspacePath) return;
					const basePath = `${workspacePath}/output/documents/${documentId}`;
					const storage = editor.storage as unknown as Record<string, Record<string, unknown>>;
					storage.image.documentBasePath = basePath;
					// Force node views to re-render so images resolve with the new base path.
					editor.view.dispatch(editor.state.tr.setMeta('preventEditorUpdate', true));
				});
				return () => {
					cancelled = true;
				};
			}, [editor, documentId]);

			const didAutoFocus = useRef(false);
			useEffect(() => {
				if (didAutoFocus.current || !autoFocus || !editor || editor.isDestroyed) return;
				didAutoFocus.current = true;
				Promise.resolve().then(() => {
					if (!editor.isDestroyed) editor.commands.focus('start');
				});
			}, [editor, autoFocus]);

			const [imageDialogOpen, setImageDialogOpen] = useState(false);

			const handleInsertImage = useCallback(() => {
				setImageDialogOpen(true);
			}, []);

			const handleImageInsert = useCallback(
				async (result: { src: string; alt: string; title: string }) => {
					if (!editor || editor.isDestroyed) return;

					let imageSrc = result.src;

					// When the source is a data URI and we have a document folder,
					// save the image file into the document's images/ directory
					// and store its relative path for portability.
					if (documentId && imageSrc.startsWith('data:')) {
						const match = imageSrc.match(/^data:image\/(\w+);base64,(.+)$/);
						if (match) {
							const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
							const base64 = match[2];
							const fileName = `${crypto.randomUUID()}.${ext}`;
							await window.workspace.saveDocumentImage({
								documentId,
								fileName,
								base64,
							});
							imageSrc = `images/${fileName}`;
						}
					}

					editor.commands.setImage({
						src: imageSrc,
						alt: result.alt || undefined,
						title: result.title || undefined,
					});
				},
				[editor, documentId]
			);

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
								if (node && node.type.name === 'assistant') return null;
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
									<BubbleMenu />
									<OptionMenu
										onContinueWithAssistant={onContinueWithAssistant}
										onInsertImage={handleInsertImage}
									/>
								</EditorProvider>
							)}
							<EditorContent editor={editor} />
							<InsertImageDialog
								open={imageDialogOpen}
								onOpenChange={setImageDialogOpen}
								onInsert={handleImageInsert}
							/>
						</div>
					</div>
				</div>
			);
		}
	)
);
TextEditor.displayName = 'TextEditor';

export { TextEditor };
