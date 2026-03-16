import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import type { ContentGeneratorMode, ContentGeneratorOptions } from './input-extension';
import { TextGeneratorContent } from './TextGeneratorContent';
import { ImageGeneratorContent } from './ImageGeneratorContent';

export function ContentGeneratorNodeView({
	editor,
	node,
	getPos,
	extension,
}: NodeViewProps): React.JSX.Element {
	const mode = node.attrs.mode as ContentGeneratorMode;
	const loading = node.attrs.loading as boolean;
	const enable = node.attrs.enable as boolean;

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);

	const [prompt, setPrompt] = useState('');
	const [files, setFiles] = useState<File[]>([]);
	const [previewUrls, setPreviewUrls] = useState<string[]>([]);
	const [isDragOver, setIsDragOver] = useState(false);

	const handleModeChange = useCallback(
		(newMode: ContentGeneratorMode) => {
			const pos = getPos();
			if (typeof pos !== 'number') return;
			editor.view.dispatch(
				editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, mode: newMode })
			);
		},
		[editor, getPos, node.attrs]
	);

	const deleteNode = useCallback(() => {
		const pos = getPos();
		if (typeof pos !== 'number') return;
		editor
			.chain()
			.focus()
			.deleteRange({ from: pos, to: pos + node.nodeSize })
			.run();
	}, [editor, getPos, node.nodeSize]);

	const submitText = useCallback(() => {
		const p = prompt.trim();
		if (!p) {
			deleteNode();
			return;
		}
		const options = extension.options as ContentGeneratorOptions;
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
		const markdownBeforeCursor = stripHtml(rawBefore);
		const markdownAfterCursor = stripHtml(rawAfter);

		options.onTextSubmit(markdownBeforeCursor, markdownAfterCursor, from, p);
	}, [prompt, extension, editor, deleteNode]);

	const submitImage = useCallback(() => {
		const trimmedPrompt = prompt.trim();
		const options = extension.options as ContentGeneratorOptions;

		if (trimmedPrompt) {
			options.onImageSubmit(trimmedPrompt);
		} else if (files.length > 0) {
			options.onFileSelect(files[0]);
		} else {
			deleteNode();
		}
	}, [prompt, files, extension, deleteNode]);

	const submit = useCallback(() => {
		if (mode === 'text') {
			submitText();
		} else {
			submitImage();
		}
	}, [mode, submitText, submitImage]);

	const submitRef = useRef(submit);
	submitRef.current = submit;
	const deleteNodeRef = useRef(deleteNode);
	deleteNodeRef.current = deleteNode;

	const resizeTextarea = useCallback(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;
		textarea.style.height = 'auto';
		textarea.style.height = `${textarea.scrollHeight}px`;
	}, []);

	const addFile = useCallback((newFile: File) => {
		setFiles((prev) => [...prev, newFile]);
		const reader = new FileReader();
		reader.onload = (e) => {
			const result = e.target?.result;
			if (typeof result === 'string') {
				setPreviewUrls((prev) => [...prev, result]);
			}
		};
		reader.readAsDataURL(newFile);
	}, []);

	const removeFile = useCallback((index: number) => {
		setFiles((prev) => prev.filter((_, i) => i !== index));
		setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const selected = e.target.files;
			if (!selected) return;
			for (const f of Array.from(selected)) {
				addFile(f);
			}
			e.target.value = '';
		},
		[addFile]
	);

	const handleDropZoneClick = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragOver(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragOver(false);
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			setIsDragOver(false);
			for (const dropped of Array.from(e.dataTransfer.files)) {
				if (dropped.type.startsWith('image/')) {
					addFile(dropped);
				}
			}
		},
		[addFile]
	);

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

	const wrapperClassName =
		mode === 'image'
			? [
					'my-2 flex flex-col gap-3 rounded-2xl border bg-popover py-3 shadow-sm transition-colors',
					isDragOver ? 'border-primary bg-primary/5' : 'border-border',
				].join(' ')
			: 'my-2 flex flex-col rounded-2xl border border-border bg-popover shadow-sm py-2';

	return (
		<NodeViewWrapper contentEditable={false}>
			<div
				ref={wrapperRef}
				className={wrapperClassName}
				onDragOver={mode === 'image' ? handleDragOver : undefined}
				onDragLeave={mode === 'image' ? handleDragLeave : undefined}
				onDrop={mode === 'image' ? handleDrop : undefined}
			>
				{mode === 'text' ? (
					<TextGeneratorContent
						prompt={prompt}
						loading={loading}
						enable={enable}
						mode={mode}
						textareaRef={textareaRef}
						submitRef={submitRef}
						onPromptChange={setPrompt}
						onResize={resizeTextarea}
						onModeChange={handleModeChange}
					/>
				) : (
					<ImageGeneratorContent
						prompt={prompt}
						loading={loading}
						mode={mode}
						files={files}
						previewUrls={previewUrls}
						textareaRef={textareaRef}
						fileInputRef={fileInputRef}
						submitRef={submitRef}
						onPromptChange={setPrompt}
						onResize={resizeTextarea}
						onRemoveFile={removeFile}
						onFileInputChange={handleFileInputChange}
						onDropZoneClick={handleDropZoneClick}
						onModeChange={handleModeChange}
					/>
				)}
			</div>
		</NodeViewWrapper>
	);
}
