import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import type { AssistantOptions } from './input-extension';
import { AssistantContent } from './AssistantContent';

export function AssistantNodeView({
	editor,
	node,
	getPos,
	extension,
}: NodeViewProps): React.JSX.Element {
	const loading = node.attrs.loading as boolean;
	const enable = node.attrs.enable as boolean;

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const [prompt, setPrompt] = useState('');

	const deleteNode = useCallback(() => {
		const pos = getPos();
		if (typeof pos !== 'number') return;
		editor
			.chain()
			.focus()
			.deleteRange({ from: pos, to: pos + node.nodeSize })
			.run();
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

	return (
		<NodeViewWrapper contentEditable={false}>
			<div
				ref={wrapperRef}
				className={[
					'group/assistant relative my-2 flex flex-col overflow-hidden rounded-[28px]',
					'border border-border/70 bg-popover/95 py-2 shadow-[0_18px_45px_hsl(var(--foreground)/0.12)]',
					'transition-all duration-300 ease-out',
					'hover:-translate-y-0.5 hover:border-[hsl(var(--info)/0.28)] hover:shadow-[0_24px_60px_hsl(var(--foreground)/0.16)]',
				].join(' ')}
			>
				<div
					className={[
						'pointer-events-none absolute inset-0 opacity-90 transition-opacity duration-300',
						'bg-[radial-gradient(circle_at_top_left,hsl(var(--info)/0.16),transparent_36%),radial-gradient(circle_at_bottom_right,hsl(var(--primary)/0.12),transparent_34%)]',
						'group-hover/assistant:opacity-100',
					].join(' ')}
				/>
				<div
					className={[
						'pointer-events-none absolute -inset-24 opacity-35 blur-3xl',
						'bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0deg,hsl(var(--info)/0.18)_70deg,transparent_140deg,hsl(var(--primary)/0.16)_220deg,transparent_300deg)]',
						'animate-[spin_18s_linear_infinite]',
					].join(' ')}
				/>
				<div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--info)/0.5)] to-transparent opacity-70" />
				<AssistantContent
					prompt={prompt}
					loading={loading}
					enable={enable}
					textareaRef={textareaRef}
					submitRef={submitRef}
					onPromptChange={setPrompt}
					onResize={resizeTextarea}
				/>
			</div>
		</NodeViewWrapper>
	);
}
