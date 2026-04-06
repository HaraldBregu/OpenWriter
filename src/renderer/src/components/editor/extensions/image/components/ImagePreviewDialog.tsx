import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/Dialog';

interface ImagePreviewDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	src: string | null;
	alt: string | null;
}

export function ImagePreviewDialog({
	open,
	onOpenChange,
	src,
	alt,
}: ImagePreviewDialogProps): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPortal>
				<DialogOverlay />
				<DialogPrimitive.Content
					className={cn(
						'fixed inset-0 z-[9999] flex items-center justify-center p-8',
						'data-[state=open]:animate-in data-[state=closed]:animate-out',
						'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
					)}
					onClick={() => onOpenChange(false)}
				>
					<DialogPrimitive.Close
						className={cn(
							'absolute right-4 top-4 z-10 rounded-full p-2',
							'bg-black/50 text-white backdrop-blur-sm',
							'transition-opacity hover:bg-black/70',
							'focus:outline-none focus:ring-2 focus:ring-white/50',
						)}
					>
						<X className="h-5 w-5" />
						<span className="sr-only">{t('imageNode.cancel')}</span>
					</DialogPrimitive.Close>
					{src && (
						<img
							src={src}
							alt={alt ?? ''}
							onClick={(e) => e.stopPropagation()}
							className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
						/>
					)}
					<DialogPrimitive.Title className="sr-only">
						{alt ?? t('imageNode.imagePreview', 'Image preview')}
					</DialogPrimitive.Title>
				</DialogPrimitive.Content>
			</DialogPortal>
		</Dialog>
	);
}
