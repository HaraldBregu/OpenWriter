import { X } from 'lucide-react';
import { PDFViewer } from '@react-pdf/renderer';
import { cn } from '@/lib/utils';
import { AppDialog, AppDialogPortal, AppDialogOverlay, AppDialogTitle } from '@/components/app';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { DocumentPdfTemplate, type DocumentPdfTemplateProps } from './DocumentPdfTemplate';

interface PdfPreviewDialogProps extends DocumentPdfTemplateProps {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	readonly closeLabel: string;
}

export function PdfPreviewDialog({
	open,
	onOpenChange,
	closeLabel,
	title,
	content,
	metadata,
}: PdfPreviewDialogProps): React.ReactElement {
	const templateProps: DocumentPdfTemplateProps = { title, content, metadata };

	return (
		<AppDialog open={open} onOpenChange={onOpenChange}>
			<AppDialogPortal>
				<AppDialogOverlay />
				<DialogPrimitive.Content
					className={cn(
						'fixed inset-0 z-[9999]',
						'data-[state=open]:animate-in data-[state=closed]:animate-out',
						'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
					)}
				>
					<AppDialogTitle className="sr-only">{title || 'Document'}</AppDialogTitle>
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						className={cn(
							'absolute right-4 top-4 z-10 rounded-full p-2',
							'bg-black/50 text-white backdrop-blur-sm',
							'transition-opacity hover:bg-black/70',
							'focus:outline-none focus:ring-2 focus:ring-white/50'
						)}
					>
						<X className="h-5 w-5" />
						<span className="sr-only">{closeLabel}</span>
					</button>
					{open && (
						<PDFViewer
							width="100%"
							height="100%"
							showToolbar={false}
							style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
						>
							<DocumentPdfTemplate />
						</PDFViewer>
					)}
				</DialogPrimitive.Content>
			</AppDialogPortal>
		</AppDialog>
	);
}
