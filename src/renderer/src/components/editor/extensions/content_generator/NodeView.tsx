import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { cn } from '@/lib/utils';
import type { ContentGeneratorOptions, ContentGeneratorStorage } from './input-extension';
import { ContentGeneratorContent } from './ContentGeneratorContent';
import type { ContentGeneratorAgentId } from './agents';
import type { ModelInfo } from '../../../../../../shared/types';
import { DEFAULT_TEXT_MODEL_ID } from '../../../../../../shared/types';
import { IMAGE_MODELS, TEXT_MODELS } from '../../../../../../shared/models';
import { buildTaskPrompt } from '../../../../pages/document/shared';

function readFileAsDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (): void => resolve(reader.result as string);
		reader.onerror = (): void => reject(new Error(`FileReader failed for ${file.name}`));
		reader.readAsDataURL(file);
	});
}

export function ContentGeneratorNodeView({
	editor,
	node,
	getPos,
	extension,
	updateAttributes,
}: NodeViewProps): React.JSX.Element {
	const loading = node.attrs.loading as boolean;
	const enable = node.attrs.enable as boolean;
	const agentId = (node.attrs.agentId as ContentGeneratorAgentId) ?? 'writer';

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [prompt, setPrompt] = useState<string>(() => (node.attrs.prompt as string) ?? '');
	const [files, setFiles] = useState<File[]>([]);
	const [previewUrls, setPreviewUrls] = useState<string[]>([]);
	const [isDragOver, setIsDragOver] = useState(false);
	const options = extension.options as ContentGeneratorOptions;
	const [selectedImageModel, setSelectedImageModel] = useState<ModelInfo>(
		() => options.defaultImageModel ?? IMAGE_MODELS[0]
	);
	const [selectedTextModel, setSelectedTextModel] = useState<ModelInfo>(
		() =>
			options.defaultTextModel ??
			TEXT_MODELS.find((m) => m.modelId === DEFAULT_TEXT_MODEL_ID) ??
			TEXT_MODELS[0]
	);

	const handleImageModelChange = useCallback(
		(model: ModelInfo) => {
			setSelectedImageModel(model);
			options.onImageModelChange?.(model);
		},
		[options]
	);

	const handleTextModelChange = useCallback(
		(model: ModelInfo) => {
			setSelectedTextModel(model);
			options.onTextModelChange?.(model);
		},
		[options]
	);

	const handlePromptChange = useCallback(
		(value: string) => {
			setPrompt(value);
			if ((node.attrs.prompt as string) !== value) {
				updateAttributes({ prompt: value });
			}
		},
		[node.attrs.prompt, updateAttributes]
	);

	const handleAgentChange = useCallback(
		(value: ContentGeneratorAgentId) => {
			if ((node.attrs.agentId as ContentGeneratorAgentId) !== value) {
				updateAttributes({ agentId: value });
			}
		},
		[node.attrs.agentId, updateAttributes]
	);

	const addFile = useCallback((newFile: File) => {
		setFiles((prev) => [...prev, newFile]);
		readFileAsDataUri(newFile)
			.then((result) => {
				setPreviewUrls((prev) => [...prev, result]);
			})
			.catch(() => {});
	}, []);

	const removeFile = useCallback((index: number) => {
		setFiles((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
		setPreviewUrls((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
	}, []);

	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const selected = e.target.files;
			if (!selected) return;
			for (const file of Array.from(selected)) {
				if (file.type.startsWith('image/')) {
					addFile(file);
				}
			}
			e.target.value = '';
		},
		[addFile]
	);

	const handleOpenFilePicker = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

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
		const canSubmitWithFiles = agentId === 'image' && files.length > 0;
		if (!trimmedPrompt && !canSubmitWithFiles) {
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

		updateAttributes({ loading: true, enable: false });

		const before = stripHtml(rawBefore);
		const after = stripHtml(rawAfter);

		if (agentId === 'image') {
			const effectivePrompt =
				!trimmedPrompt && files.length > 0
					? 'Create an image inspired by the uploaded reference images.'
					: trimmedPrompt;
			const builtPrompt = buildTaskPrompt(before, after, effectivePrompt);
			options.onGenerateImageSubmit(builtPrompt, files);
		} else {
			const builtPrompt = buildTaskPrompt(before, after, trimmedPrompt);
			options.onGenerateTextSubmit(builtPrompt);
		}
	}, [agentId, files, prompt, deleteNode, editor, extension.options, updateAttributes]);

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

	const handleDragOver = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			if (agentId !== 'image') return;
			e.preventDefault();
			setIsDragOver(true);
		},
		[agentId]
	);

	const handleDragLeave = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			if (agentId !== 'image') return;
			e.preventDefault();
			setIsDragOver(false);
		},
		[agentId]
	);

	const handleDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			if (agentId !== 'image') return;
			e.preventDefault();
			setIsDragOver(false);
			for (const file of Array.from(e.dataTransfer.files)) {
				if (file.type.startsWith('image/')) {
					addFile(file);
				}
			}
		},
		[addFile, agentId]
	);

	const wrapperClassName = cn(
		'group/assistant relative my-3 flex flex-col overflow-hidden rounded-[1.55rem] border-[0.5px] text-card-foreground backdrop-blur-xl',
		'bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--card)/0.96)_100%)]',
		'shadow-[0_1px_0_hsl(var(--background)/0.94)_inset,0_10px_28px_hsl(var(--foreground)/0.06)]',
		'transition-[border-color,box-shadow,background-color,transform] duration-200 ease-out',
		'dark:bg-[linear-gradient(180deg,hsl(var(--card)/0.98)_0%,hsl(var(--card)/0.92)_100%)]',
		'dark:shadow-[0_1px_0_hsl(var(--foreground)/0.08)_inset,0_12px_30px_hsl(var(--background)/0.5)]',
		loading
			? 'border-primary/45 shadow-[0_1px_0_hsl(var(--background)/0.94)_inset,0_0_0_0.5px_hsl(var(--primary)/0.12),0_12px_30px_hsl(var(--primary)/0.12)] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.08)_inset,0_0_0_0.5px_hsl(var(--primary)/0.16),0_14px_34px_hsl(var(--primary)/0.14)]'
			: 'border-border/85 hover:-translate-y-[1px] hover:border-foreground/14 hover:shadow-[0_1px_0_hsl(var(--background)/0.94)_inset,0_12px_30px_hsl(var(--foreground)/0.07)] dark:border-white/12 dark:hover:border-white/18 dark:hover:shadow-[0_1px_0_hsl(var(--foreground)/0.08)_inset,0_14px_34px_hsl(var(--background)/0.56)]',
		agentId === 'image' && isDragOver
			? 'border-primary/55 bg-[linear-gradient(180deg,hsl(var(--primary)/0.08)_0%,hsl(var(--card)/0.96)_32%,hsl(var(--card))_100%)] shadow-[0_1px_0_hsl(var(--background)/0.94)_inset,0_0_0_0.5px_hsl(var(--primary)/0.16),0_14px_34px_hsl(var(--primary)/0.14)] dark:bg-[linear-gradient(180deg,hsl(var(--primary)/0.14)_0%,hsl(var(--card)/0.94)_34%,hsl(var(--card)/0.92)_100%)] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.08)_inset,0_0_0_0.5px_hsl(var(--primary)/0.18),0_16px_38px_hsl(var(--primary)/0.16)]'
			: '',
		!enable && !loading
			? 'border-border/70 bg-[linear-gradient(180deg,hsl(var(--muted)/0.72)_0%,hsl(var(--muted)/0.6)_100%)] shadow-[0_1px_0_hsl(var(--background)/0.9)_inset,0_6px_16px_hsl(var(--foreground)/0.04)] dark:border-white/10 dark:bg-[linear-gradient(180deg,hsl(var(--muted)/0.34)_0%,hsl(var(--muted)/0.24)_100%)] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.06)_inset,0_10px_24px_hsl(var(--background)/0.4)]'
			: '',
		'focus-within:border-primary/45 focus-within:shadow-[0_1px_0_hsl(var(--background)/0.94)_inset,0_0_0_0.5px_hsl(var(--primary)/0.12),0_14px_36px_hsl(var(--primary)/0.12)]',
		'dark:focus-within:border-primary/45 dark:focus-within:shadow-[0_1px_0_hsl(var(--foreground)/0.08)_inset,0_0_0_0.5px_hsl(var(--primary)/0.15),0_16px_40px_hsl(var(--primary)/0.14)]'
	);

	return (
		<NodeViewWrapper contentEditable={false}>
			<div
				className={wrapperClassName}
				onDragOver={agentId === 'image' ? handleDragOver : undefined}
				onDragLeave={agentId === 'image' ? handleDragLeave : undefined}
				onDrop={agentId === 'image' ? handleDrop : undefined}
			>
				<div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/14 via-primary/4 to-transparent dark:from-primary/18 dark:via-primary/6" />
				<div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent dark:via-primary/65" />
				<ContentGeneratorContent
					prompt={prompt}
					agentId={agentId}
					files={files}
					previewUrls={previewUrls}
					isDragOver={isDragOver}
					loading={loading}
					enable={enable}
					selectedImageModel={selectedImageModel}
					selectedTextModel={selectedTextModel}
					textareaRef={textareaRef}
					fileInputRef={fileInputRef}
					submitRef={submitRef}
					onPromptChange={handlePromptChange}
					onAgentChange={handleAgentChange}
					onImageModelChange={handleImageModelChange}
					onTextModelChange={handleTextModelChange}
					onRemoveFile={removeFile}
					onFileInputChange={handleFileInputChange}
					onOpenFilePicker={handleOpenFilePicker}
					onResize={resizeTextarea}
				/>
			</div>
		</NodeViewWrapper>
	);
}
