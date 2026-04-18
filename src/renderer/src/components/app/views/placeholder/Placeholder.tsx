import React, { useCallback } from 'react';
import type { NodeViewProps } from '@tiptap/react';
import { ImageIcon } from 'lucide-react';
import { FileUpload, FileUploadDropzone } from '@/components/ui/FileUpload';
import { ImagePlaceholderOptions } from '../../editor/extensions/image-placeholder-extension';

const IMAGE_MIME_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';

interface PlaceholderProps {
	nodeViewProps: NodeViewProps;
}

export function Placeholder({ nodeViewProps }: PlaceholderProps): React.JSX.Element {
	const { editor, node, getPos, extension } = nodeViewProps;

	const deleteNode = useCallback(() => {
		const pos = getPos();
		if (typeof pos !== 'number') return;
		editor
			.chain()
			.focus()
			.deleteRange({ from: pos, to: pos + node.nodeSize })
			.run();
	}, [editor, getPos, node.nodeSize]);

	const handleFileAccept = useCallback(
		(file: File) => {
			const options = extension.options as ImagePlaceholderOptions;
			deleteNode();
			options.onImageInsert?.(file, null);
		},
		[deleteNode, extension.options]
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>) => {
			if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'Delete') {
				e.preventDefault();
				deleteNode();
			}
		},
		[deleteNode]
	);

	return (
		<div className="my-4">
			<FileUpload
				accept={IMAGE_MIME_ACCEPT}
				maxFiles={1}
				onFileAccept={handleFileAccept}
				label="Select an image to insert"
			>
				<FileUploadDropzone
					className="flex-col gap-2 px-6 py-10 text-sm text-muted-foreground"
					onKeyDown={handleKeyDown}
				>
					<ImageIcon className="h-8 w-8 shrink-0 opacity-60" />
					<span>Drag &amp; drop an image or click to select</span>
				</FileUploadDropzone>
			</FileUpload>
		</div>
	);
}
