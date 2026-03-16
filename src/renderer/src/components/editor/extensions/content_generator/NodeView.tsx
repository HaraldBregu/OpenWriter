import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { AppTextarea } from '@components/app/AppTextarea';
import { AppButton } from '@components/app/AppButton';
import { AppCheckbox } from '@components/app/AppCheckbox';
import { ArrowUp, LoaderCircle, Plus, X } from 'lucide-react';
import type { ContentGeneratorMode, ContentGeneratorOptions } from './input-extension';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';

interface TextGeneratorContentProps {
	prompt: string;
	loading: boolean;
	enable: boolean;
	textareaRef: React.RefObject<HTMLTextAreaElement>;
	submitRef: React.RefObject<() => void>;
	onPromptChange: (value: string) => void;
	onResize: () => void;
}

function TextGeneratorContent({
	prompt,
	loading,
	enable,
	textareaRef,
	submitRef,
	onPromptChange,
	onResize,
}: TextGeneratorContentProps): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<>
			<AppTextarea
				ref={textareaRef}
				value={prompt}
				onChange={(e) => {
					onPromptChange(e.target.value);
					onResize();
				}}
				disabled={!enable}
				className="min-h-[40px] resize-none border-none bg-transparent px-4 pt-3 pb-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
				placeholder={t('agentPrompt.placeholder')}
				rows={1}
			/>
			<div className="flex items-center justify-between px-3 pb-2">
				<AppButton
					variant="ghost"
					size="icon"
					className="h-7 w-7 text-muted-foreground"
					disabled={!enable}
				>
					<Plus className="h-4 w-4" />
				</AppButton>
				<div className="flex items-center gap-3">
					<label className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<AppCheckbox className="h-3.5 w-3.5" disabled={!enable} />
						{t('agentPrompt.search')}
					</label>
					<label className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<AppCheckbox className="h-3.5 w-3.5" disabled={!enable} />
						{t('agentPrompt.rag')}
					</label>
					<AppButton
						variant="prompt-submit"
						size="prompt-submit-md"
						className="shrink-0"
						disabled={!enable || loading || !prompt.trim()}
						onMouseDown={(e) => {
							e.preventDefault();
							if (!loading) submitRef.current?.();
						}}
					>
						{loading ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
					</AppButton>
				</div>
			</div>
		</>
	);
}

interface ImageGeneratorContentProps {
	prompt: string;
	loading: boolean;
	files: File[];
	previewUrls: string[];
	isDragOver: boolean;
	textareaRef: React.RefObject<HTMLTextAreaElement>;
	fileInputRef: React.RefObject<HTMLInputElement>;
	submitRef: React.RefObject<() => void>;
	onPromptChange: (value: string) => void;
	onResize: () => void;
	onRemoveFile: (index: number) => void;
	onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onDropZoneClick: () => void;
	onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
	onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
	onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}

function ImageGeneratorContent({
	prompt,
	loading,
	files,
	previewUrls,
	isDragOver,
	textareaRef,
	fileInputRef,
	submitRef,
	onPromptChange,
	onResize,
	onRemoveFile,
	onFileInputChange,
	onDropZoneClick,
	onDragOver,
	onDragLeave,
	onDrop,
}: ImageGeneratorContentProps): React.JSX.Element {
	const { t } = useTranslation();
	const isSubmitDisabled = loading || (!prompt.trim() && files.length === 0);

	return (
		<div
			className={[
				'flex flex-col gap-3',
				isDragOver ? 'border-primary bg-primary/5' : '',
			].join(' ')}
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
		>
			<input
				ref={fileInputRef}
				type="file"
				accept={ACCEPTED_IMAGE_TYPES}
				className="hidden"
				onChange={onFileInputChange}
				aria-hidden="true"
				tabIndex={-1}
				multiple
			/>

			<div className="flex gap-2 overflow-x-auto px-3 scrollbar-none">
				{previewUrls.map((url, index) => (
					<div key={index} className="group/thumb relative shrink-0">
						<img
							src={url}
							alt={files[index]?.name ?? ''}
							className="h-10 w-10 rounded-lg object-cover"
						/>
						<AppButton
							variant="ghost"
							size="icon-xs"
							className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-background/80 text-muted-foreground opacity-0 transition-opacity group-hover/thumb:opacity-100 hover:bg-background hover:text-foreground"
							onMouseDown={(e) => {
								e.preventDefault();
								onRemoveFile(index);
							}}
							aria-label={t('imagePlaceholder.removeImage', { defaultValue: 'Remove image' })}
						>
							<X className="h-3 w-3" />
						</AppButton>
					</div>
				))}
				<div
					role="button"
					tabIndex={0}
					className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-muted transition-colors hover:bg-muted/70"
					onMouseDown={(e) => {
						e.preventDefault();
						onDropZoneClick();
					}}
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							onDropZoneClick();
						}
					}}
					aria-label={t('imagePlaceholder.addImage', { defaultValue: 'Add image' })}
				>
					<Plus className="h-4 w-4 text-muted-foreground" />
				</div>
			</div>

			<div className="flex items-end gap-2 px-3">
				<AppTextarea
					ref={textareaRef}
					value={prompt}
					onChange={(e) => {
						onPromptChange(e.target.value);
						onResize();
					}}
					disabled={loading}
					className="min-h-[40px] min-w-0 flex-1 resize-none border-none bg-transparent px-1 pt-1 pb-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
					placeholder={t('imagePlaceholder.promptPlaceholder', {
						defaultValue: 'Describe the image you want to create...',
					})}
					rows={1}
				/>
				<AppButton
					variant="prompt-submit"
					size="prompt-submit-md"
					className="shrink-0"
					disabled={isSubmitDisabled}
					onMouseDown={(e) => {
						e.preventDefault();
						if (!loading) submitRef.current?.();
					}}
					aria-label={t('imagePlaceholder.submit', { defaultValue: 'Generate image' })}
				>
					{loading ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
				</AppButton>
			</div>
		</div>
	);
}

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
			<div ref={wrapperRef} className={wrapperClassName}>
				{mode === 'text' ? (
					<TextGeneratorContent
						prompt={prompt}
						loading={loading}
						enable={enable}
						textareaRef={textareaRef}
						submitRef={submitRef}
						onPromptChange={setPrompt}
						onResize={resizeTextarea}
					/>
				) : (
					<ImageGeneratorContent
						prompt={prompt}
						loading={loading}
						files={files}
						previewUrls={previewUrls}
						isDragOver={isDragOver}
						textareaRef={textareaRef}
						fileInputRef={fileInputRef}
						submitRef={submitRef}
						onPromptChange={setPrompt}
						onResize={resizeTextarea}
						onRemoveFile={removeFile}
						onFileInputChange={handleFileInputChange}
						onDropZoneClick={handleDropZoneClick}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
					/>
				)}
			</div>
		</NodeViewWrapper>
	);
}
