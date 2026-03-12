import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { AppTextarea } from '@components/app/AppTextarea';
import { AppButton } from '@components/app/AppButton';
import { AppCheckbox } from '@components/app/AppCheckbox';
import { ArrowUp, LoaderCircle, Plus } from 'lucide-react';
import type { AgentPromptOptions } from '../agent-prompt-extension';

export function AgentPromptNodeView({
	editor,
	node,
	getPos,
	extension,
}: NodeViewProps): React.JSX.Element {
	const { t } = useTranslation();
	const loading = node.attrs.loading as boolean;
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
		const options = extension.options as AgentPromptOptions;
		options.onSubmit(p);
	}, [prompt, extension, deleteNode]);

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
				className="my-2 flex flex-col rounded-2xl border border-border bg-popover shadow-sm py-2"
			>
				<AppTextarea
					ref={textareaRef}
					value={prompt}
					onChange={(e) => {
						setPrompt(e.target.value);
						resizeTextarea();
					}}
					className="min-h-[40px] resize-none border-none bg-transparent px-4 pt-3 pb-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
					placeholder="Ask the AI Agent and press Enter…"
					rows={1}
				/>
				<div className="flex items-center justify-between px-3 pb-2">
					<AppButton variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
						<Plus className="h-4 w-4" />
					</AppButton>
					<div className="flex items-center gap-3">
						<label className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<AppCheckbox className="h-3.5 w-3.5" />
							Search
						</label>
						<label className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<AppCheckbox className="h-3.5 w-3.5" />
							RAG
						</label>
						<AppButton
							variant="prompt-submit"
							size="prompt-submit-md"
							className="shrink-0"
							disabled={loading || !prompt.trim()}
							onMouseDown={(e) => {
								e.preventDefault();
								if (!loading) submitRef.current();
							}}
						>
							{loading ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
						</AppButton>
					</div>
				</div>
			</div>
		</NodeViewWrapper>
	);
}
