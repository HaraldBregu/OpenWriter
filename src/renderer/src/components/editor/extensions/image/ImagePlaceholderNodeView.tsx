import React, { useCallback, useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImagePlaceholderOptions } from './image-placeholder-extension';

const IMAGE_MIME_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';
const IMAGE_MIME_PATTERN = /^image\/(jpeg|jpg|png|gif|webp|svg\+xml|avif)$/;

function isImageFile(file: File): boolean {
	return IMAGE_MIME_PATTERN.test(file.type);
}

export function ImagePlaceholderNodeView({
	editor,
	node,
	getPos,
	extension,
}: NodeViewProps): React.JSX.Element {
	const fileInputRef = useRef<HTMLInputElement>(null);
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

	const handleFile = useCallback(
		(file: File) => {
			if (!isImageFile(file)) return;
			const options = extension.options as ImagePlaceholderOptions;
			const pos = getPos();
			if (typeof pos !== 'number') return;
			editor
				.chain()
				.focus()
				.deleteRange({ from: pos, to: pos + node.nodeSize })
				.run();
			options.onImageInsert?.(file, null);
		},
		[editor, extension.options, getPos, node.nodeSize]
	);

	const handleClick = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) {
				handleFile(file);
			}
			e.target.value = '';
		},
		[handleFile]
	);

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
			const file = Array.from(e.dataTransfer.files).find(isImageFile);
			if (file) {
				handleFile(file);
			}
		},
		[handleFile]
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				fileInputRef.current?.click();
			}
			if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'Delete') {
				e.preventDefault();
				deleteNode();
			}
		},
		[deleteNode]
	);

	return (
		<NodeViewWrapper contentEditable={false} className="my-4">
			<input
				ref={fileInputRef}
				type="file"
				accept={IMAGE_MIME_ACCEPT}
				className="hidden"
				onChange={handleFileInputChange}
			/>
			<div
				role="button"
				tabIndex={0}
				aria-label="Select an image to insert"
				className={cn(
					'flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-sm transition-colors',
					isDragOver
						? 'border-primary bg-primary/8 text-primary'
						: 'border-border bg-muted/40 text-muted-foreground hover:border-primary/60 hover:bg-muted/70 hover:text-foreground'
				)}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			>
				<ImageIcon className="h-8 w-8 shrink-0 opacity-60" />
				<span>Drag & drop an image or click to select</span>
			</div>
		</NodeViewWrapper>
	);
}
