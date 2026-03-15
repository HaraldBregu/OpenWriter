import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { AppTextarea } from '@components/app/AppTextarea';
import { AppButton } from '@components/app/AppButton';
import { ArrowUp, ImagePlus, LoaderCircle, X } from 'lucide-react';
import type { ImagePlaceholderOptions } from '../image-placeholder-extension';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';

interface ImageStyle {
	id: string;
	label: string;
	emoji: string;
}

const IMAGE_STYLES: ImageStyle[] = [
	{ id: 'none', label: 'None', emoji: '🚫' },
	{ id: 'photorealistic', label: 'Photo', emoji: '📷' },
	{ id: 'illustration', label: 'Illustration', emoji: '🎨' },
	{ id: 'watercolor', label: 'Watercolor', emoji: '💧' },
	{ id: 'oil-painting', label: 'Oil Paint', emoji: '🖼️' },
	{ id: 'pencil-sketch', label: 'Sketch', emoji: '✏️' },
	{ id: 'digital-art', label: 'Digital Art', emoji: '💻' },
	{ id: 'anime', label: 'Anime', emoji: '🌸' },
	{ id: 'pixel-art', label: 'Pixel Art', emoji: '👾' },
	{ id: '3d-render', label: '3D Render', emoji: '🧊' },
	{ id: 'comic', label: 'Comic', emoji: '💬' },
	{ id: 'minimalist', label: 'Minimal', emoji: '⬜' },
];

export function AiImageNodeView({
	editor,
	node,
	getPos,
	extension,
}: NodeViewProps): React.JSX.Element {
	const { t } = useTranslation();
	const loading = node.attrs.loading as boolean;
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);

	const [prompt, setPrompt] = useState('');
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [isDragOver, setIsDragOver] = useState(false);
	const [selectedStyle, setSelectedStyle] = useState('none');

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
		const options = extension.options as ImagePlaceholderOptions;
		const style = selectedStyle !== 'none' ? selectedStyle : undefined;

		if (trimmedPrompt) {
			const fullPrompt = style ? `${trimmedPrompt}, ${style} style` : trimmedPrompt;
			options.onSubmit(fullPrompt);
		} else if (file) {
			options.onFileSelect(file);
		} else {
			deleteNode();
		}
	}, [prompt, file, selectedStyle, extension, deleteNode]);

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

	const applyFile = useCallback((selectedFile: File) => {
		setFile(selectedFile);
		const reader = new FileReader();
		reader.onload = (e) => {
			const result = e.target?.result;
			if (typeof result === 'string') {
				setPreviewUrl(result);
			}
		};
		reader.readAsDataURL(selectedFile);
	}, []);

	const clearFile = useCallback(() => {
		setFile(null);
		setPreviewUrl(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	}, []);

	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const selected = e.target.files?.[0];
			if (selected) {
				applyFile(selected);
			}
		},
		[applyFile]
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
			const dropped = e.dataTransfer.files[0];
			if (dropped && dropped.type.startsWith('image/')) {
				applyFile(dropped);
			}
		},
		[applyFile]
	);

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

	// Revoke the object URL on unmount to avoid memory leaks.
	useEffect(() => {
		return () => {
			if (previewUrl && previewUrl.startsWith('blob:')) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	}, [previewUrl]);

	const isSubmitDisabled = loading || (!prompt.trim() && !file);

	return (
		<NodeViewWrapper contentEditable={false}>
			<div
				ref={wrapperRef}
				className="my-2 flex flex-col rounded-2xl border border-border bg-popover shadow-sm py-2"
			>
				<div className="px-3 pt-2 pb-2">
					{previewUrl ? (
						<div className="relative inline-block">
							<img
								src={previewUrl}
								alt={file?.name ?? ''}
								className="max-h-40 rounded-xl object-contain"
							/>
							<AppButton
								variant="ghost"
								size="icon-xs"
								className="absolute right-1 top-1 h-5 w-5 bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground"
								onMouseDown={(e) => {
									e.preventDefault();
									clearFile();
								}}
								aria-label={t('imagePlaceholder.removeImage', { defaultValue: 'Remove image' })}
							>
								<X />
							</AppButton>
						</div>
					) : (
						<div
							role="button"
							tabIndex={0}
							aria-label={t('imagePlaceholder.dropZoneLabel', {
								defaultValue: 'Drop an image here, or click to browse',
							})}
							className={[
								'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition-colors',
								isDragOver
									? 'border-primary bg-primary/5'
									: 'border-border hover:border-primary/50',
							].join(' ')}
							onClick={handleDropZoneClick}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									handleDropZoneClick();
								}
							}}
							onDragOver={handleDragOver}
							onDragLeave={handleDragLeave}
							onDrop={handleDrop}
						>
							<ImagePlus className="h-6 w-6 text-muted-foreground" />
							<span className="text-xs text-muted-foreground">
								{t('imagePlaceholder.dropZoneLabel', {
									defaultValue: 'Drop an image here, or click to browse',
								})}
							</span>
						</div>
					)}
					<input
						ref={fileInputRef}
						type="file"
						accept={ACCEPTED_IMAGE_TYPES}
						className="hidden"
						onChange={handleFileInputChange}
						aria-hidden="true"
						tabIndex={-1}
					/>
				</div>

				<AppTextarea
					ref={textareaRef}
					value={prompt}
					onChange={(e) => {
						setPrompt(e.target.value);
						resizeTextarea();
					}}
					disabled={loading}
					className="min-h-[40px] resize-none border-none bg-transparent px-4 pt-1 pb-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
					placeholder={t('imagePlaceholder.promptPlaceholder', {
						defaultValue: 'Describe the image you want to create...',
					})}
					rows={1}
				/>

				<div className="flex gap-2 overflow-x-auto px-3 pb-2 scrollbar-none">
					{IMAGE_STYLES.map((style) => (
						<button
							key={style.id}
							type="button"
							className={[
								'flex shrink-0 flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition-colors',
								selectedStyle === style.id
									? 'bg-accent text-accent-foreground'
									: 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
							].join(' ')}
							onMouseDown={(e) => {
								e.preventDefault();
								setSelectedStyle(style.id);
							}}
						>
							<span className="text-base leading-none">{style.emoji}</span>
							<span className="leading-none">{style.label}</span>
						</button>
					))}
				</div>

				<div className="flex items-center justify-end px-3 pb-1">
					<AppButton
						variant="prompt-submit"
						size="prompt-submit-md"
						className="shrink-0"
						disabled={isSubmitDisabled}
						onMouseDown={(e) => {
							e.preventDefault();
							if (!loading) submitRef.current();
						}}
						aria-label={t('imagePlaceholder.submit', { defaultValue: 'Generate image' })}
					>
						{loading ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
					</AppButton>
				</div>
			</div>
		</NodeViewWrapper>
	);
}
