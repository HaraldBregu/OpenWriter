import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { AppInput } from '@components/app/AppInput';
import { AppButton } from '@components/app/AppButton';
import { ArrowUp, Bot } from 'lucide-react';

export function AgentPromptNodeView({ editor, node, getPos }: NodeViewProps): React.JSX.Element {
	const inputRef = useRef<HTMLInputElement>(null);
	const [prompt, setPrompt] = useState('');

	useEffect(() => {
		requestAnimationFrame(() => inputRef.current?.focus());
	}, []);

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

	return (
		<NodeViewWrapper contentEditable={false}>
			<div className="my-2 flex items-center gap-2 rounded-xl border border-border bg-popover px-5 py-2 shadow-md">
				<Bot className="shrink-0 text-violet-500" style={{ width: 18, height: 18 }} />
				<AppInput
					ref={inputRef}
					value={prompt}
					onChange={(e) => setPrompt(e.target.value)}
					className="border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
					onKeyDown={(e) => {
						e.stopPropagation();
						if (e.key === 'Enter') {
							e.preventDefault();
							submit();
						} else if (e.key === 'Escape') {
							deleteNode();
						}
					}}
					placeholder="Ask the AI Agent and press Enter…"
				/>
				<AppButton
					variant="prompt-submit"
					size="prompt-icon-sm"
					className="shrink-0"
					disabled={!prompt.trim()}
					onMouseDown={(e) => {
						e.preventDefault();
						submit();
					}}
				>
					<ArrowUp />
				</AppButton>
			</div>
		</NodeViewWrapper>
	);
}
