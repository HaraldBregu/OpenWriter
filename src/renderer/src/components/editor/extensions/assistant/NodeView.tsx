import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import type { AssistantOptions } from './input-extension';
import { AssistantContent } from './AssistantContent';

export function AssistantNodeView({
	editor,
	node,
	getPos,
	extension,
	updateAttributes,
}: NodeViewProps): React.JSX.Element {
	const loading = node.attrs.loading as boolean;
	const enable = node.attrs.enable as boolean;

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const [prompt, setPrompt] = useState<string>(() => (node.attrs.prompt as string) ?? '');

	const handlePromptChange = useCallback(
		(value: string) => {
			setPrompt(value);
			if ((node.attrs.prompt as string) !== value) {
				updateAttributes({ prompt: value });
			}
		},
		[node.attrs.prompt, updateAttributes]
	);

	const deleteNode = useCallback(() => {
		const pos = getPos();
		if (typeof pos !== 'number') return;

		const paragraph = editor.state.schema.nodes.paragraph;
		if (!paragraph) {
			editor
				.chain()
				.focus()
				.deleteRange({ from: pos, to: pos + node.nodeSize })
				.run();
			return;
		}

		// Keep an editable block in place when the assistant UI is dismissed.
		const tr = editor.state.tr.replaceWith(pos, pos + node.nodeSize, paragraph.create());
		tr.setSelection(TextSelection.create(tr.doc, Math.min(pos + 1, tr.doc.content.size)));
		editor.view.dispatch(tr.scrollIntoView());
		editor.view.focus();
	}, [editor, getPos, node.nodeSize]);

	const submit = useCallback(() => {
		const trimmedPrompt = prompt.trim();
		if (!trimmedPrompt) {
			deleteNode();
			return;
		}

		const options = extension.options as AssistantOptions;
		const { from } = editor.state.selection;
		const storage = editor.storage as unknown as Record<string, Record<string, unknown>>;
		const serializer = storage.markdown?.serializer as
			| { serialize: (node: unknown) => string }
			| undefined;
		const docSize = editor.state.doc.content.size;
		const subDocBefore = editor.state.doc.cut(0, from);
		const subDocAfter = editor.state.doc.cut(from, docSize);
		const rawBefore =
			serializer?.serialize(subDocBefore) ?? editor.state.doc.textBetween(0, from, '\n');
		const rawAfter =
			serializer?.serialize(subDocAfter) ?? editor.state.doc.textBetween(from, docSize, '\n');
		const stripHtml = (text: string): string => text.replace(/<[^>]*>/g, '');

		options.onSubmit(stripHtml(rawBefore), stripHtml(rawAfter), from, trimmedPrompt);
	}, [prompt, deleteNode, editor, extension.options]);

	const submitRef = useRef<(() => void) | null>(submit);
	submitRef.current = submit;
	const deleteNodeRef = useRef(deleteNode);
	deleteNodeRef.current = deleteNode;

	const resizeTextarea = useCallback(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;
		textarea.style.height = 'auto';
		textarea.style.height = `${textarea.scrollHeight}px`;
	}, []);

	useEffect(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		requestAnimationFrame(() => {
			textarea.focus();
			resizeTextarea();
		});

		const handleKeyDown = (e: KeyboardEvent): void => {
			e.stopPropagation();
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				submitRef.current?.();
			} else if (e.key === 'Escape') {
				deleteNodeRef.current();
			}
		};

		textarea.addEventListener('keydown', handleKeyDown);
		return () => textarea.removeEventListener('keydown', handleKeyDown);
	}, [resizeTextarea]);

	useEffect(() => {
		const handleMouseDown = (e: MouseEvent): void => {
			const wrapper = wrapperRef.current;
			if (!wrapper) return;
			if (wrapper.contains(e.target as Node)) return;
			const target = e.target as Element;
			if (target.closest('[data-radix-popper-content-wrapper]')) return;
			deleteNodeRef.current();
		};

		document.addEventListener('mousedown', handleMouseDown, true);
		return () => document.removeEventListener('mousedown', handleMouseDown, true);
	}, []);

	const wrapperClassName = [
		'group/assistant relative my-3 flex flex-col overflow-hidden rounded-[1.4rem]',
		'border bg-card/95 text-card-foreground ring-1 ring-black/6 backdrop-blur-sm',
		'transition-[border-color,box-shadow,background-color] duration-200 ease-out',
		loading
			? 'border-primary/35 shadow-[0_20px_44px_hsl(var(--primary)/0.14),0_34px_80px_hsl(var(--foreground)/0.14)]'
			: 'border-border/85 shadow-[0_16px_34px_hsl(var(--foreground)/0.08),0_28px_72px_hsl(var(--foreground)/0.12)] hover:border-foreground/15 hover:shadow-[0_20px_44px_hsl(var(--foreground)/0.1),0_36px_88px_hsl(var(--foreground)/0.16)]',
		!enable && !loading ? 'bg-muted/55' : '',
		'focus-within:border-primary/45 focus-within:shadow-[0_22px_48px_hsl(var(--primary)/0.12),0_36px_92px_hsl(var(--foreground)/0.18)] dark:border-border/90 dark:bg-card/95 dark:ring-[hsl(var(--border)/0.55)]',
	].join(' ');

	return (
		<NodeViewWrapper contentEditable={false}>
			<div ref={wrapperRef} className={wrapperClassName}>
				<div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary/12 via-primary/5 to-transparent" />
				<div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
				<AssistantContent
					prompt={prompt}
					loading={loading}
					enable={enable}
					textareaRef={textareaRef}
					submitRef={submitRef}
					onPromptChange={handlePromptChange}
					onResize={resizeTextarea}
				/>
			</div>
		</NodeViewWrapper>
	);
}
