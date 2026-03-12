import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { AppTextarea } from '@components/app/AppTextarea';
import { AppButton } from '@components/app/AppButton';
import { ArrowUp, Plus } from 'lucide-react';

export function AgentPromptNodeView({ editor, node, getPos }: NodeViewProps): React.JSX.Element {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
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
		const p = prompt.trim();
		if (!p) {
			deleteNode();
			return;
		}
		const onSubmit = editor.storage.agentPrompt?.onSubmit;
		onSubmit?.(p);
		deleteNode();
	}, [prompt, editor, deleteNode]);

	const submitRef = useRef(submit);
	submitRef.current = submit;
	const deleteNodeRef = useRef(deleteNode);
	deleteNodeRef.current = deleteNode;

	const wrapperRef = useRef<HTMLDivElement>(null);

	const resizeTextarea = useCallback(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;
		textarea.style.height = 'auto';
		textarea.style.height = `${textarea.scrollHeight}px`;
	}, []);

	// Use a native DOM listener so stopPropagation fires before ProseMirror's
	// keydown handler (React 18 delegates events at the root, which is too late).
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
				submitRef.current();
			} else if (e.key === 'Escape') {
				deleteNodeRef.current();
			}
		};

		textarea.addEventListener('keydown', handleKeyDown);
		return () => textarea.removeEventListener('keydown', handleKeyDown);
	}, [resizeTextarea]);

	// Click outside → remove the node.
	useEffect(() => {
		const handleMouseDown = (e: MouseEvent): void => {
			const wrapper = wrapperRef.current;
			if (!wrapper) return;
			if (wrapper.contains(e.target as Node)) return;
			deleteNodeRef.current();
		};

		document.addEventListener('mousedown', handleMouseDown, true);
		return () => document.removeEventListener('mousedown', handleMouseDown, true);
	}, []);

	return (
		<NodeViewWrapper contentEditable={false}>
			<div
				ref={wrapperRef}
				className="my-2 flex items-start gap-2 rounded-xl border border-border bg-popover px-5 py-2 shadow-md"
			>
				<Bot className="mt-2 shrink-0 text-violet-500" style={{ width: 18, height: 18 }} />
				<AppTextarea
					ref={textareaRef}
					value={prompt}
					onChange={(e) => {
						setPrompt(e.target.value);
						resizeTextarea();
					}}
					className="min-h-[36px] resize-none border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
					placeholder="Ask the AI Agent and press Enter…"
					rows={1}
				/>
				<AppButton
					variant="prompt-submit"
					size="prompt-icon-sm"
					className="shrink-0"
					disabled={!prompt.trim()}
					onMouseDown={(e) => {
						e.preventDefault();
						submitRef.current();
					}}
				>
					<ArrowUp />
				</AppButton>
			</div>
		</NodeViewWrapper>
	);
}
