import { useMemo } from 'react';
import { X } from 'lucide-react';
import { PDFViewer } from '@react-pdf/renderer';
import { cn } from '@/lib/utils';
import { AppDialog, AppDialogContent, AppDialogTitle } from '@/components/app';
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
	images,
}: PdfPreviewDialogProps): React.ReactElement {
	const pdfDocument = useMemo(
		() => <DocumentPdfTemplate title={title} content={content} images={images} />,
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[title, content, images]
	);

	return (
		<AppDialog open={open} onOpenChange={onOpenChange}>
			<AppDialogContent
				className={cn(
					'fixed inset-0 z-[9999] h-screen w-screen',
					'max-w-none translate-x-0 translate-y-0',
					'rounded-none sm:rounded-none',
					'border-0 p-0 gap-0 shadow-none'
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
						{pdfDocument}
					</PDFViewer>
				)}
			</AppDialogContent>
		</AppDialog>
	);
}
