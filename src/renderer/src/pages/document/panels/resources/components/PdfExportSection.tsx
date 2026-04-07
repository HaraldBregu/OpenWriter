import { useCallback, useState } from 'react';
import { FileDown, Loader2, Eye, X } from 'lucide-react';
import { usePDF } from '@react-pdf/renderer';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';
import type { OutputFileMetadata } from '../../../../../../../shared/types';
import { DocumentPdfTemplate } from './DocumentPdfTemplate';

export interface PdfExportSectionProps {
	readonly title: string;
	readonly content: string;
	readonly metadata: OutputFileMetadata;
	readonly sectionClassName: string;
	readonly exportLabel: string;
	readonly downloadLabel: string;
	readonly previewLabel: string;
}

const ICON_BUTTON_CLASS =
	'rounded-full p-1 text-muted-foreground/70 transition-colors hover:bg-accent/75 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

export function PdfExportSection({
	title,
	content,
	metadata,
	sectionClassName,
	exportLabel,
	downloadLabel,
	previewLabel,
}: PdfExportSectionProps): React.ReactElement {
	const [{ loading, url }] = usePDF({
		document: <DocumentPdfTemplate title={title} content={content} metadata={metadata} />,
	});

	const [previewOpen, setPreviewOpen] = useState(false);

	const handleDownload = useCallback(() => {
		if (!url) return;
		const a = document.createElement('a');
		a.href = url;
		a.download = `${title || 'document'}.pdf`;
		a.click();
	}, [url, title]);

	return (
		<>
			<div className={sectionClassName}>
				<div className="mb-3 flex items-center justify-between gap-2">
					<span className="text-xs font-medium text-muted-foreground/70">{exportLabel}</span>
					<div className="flex items-center gap-1">
						<button
							type="button"
							disabled={loading || !url}
							onClick={() => setPreviewOpen(true)}
							className={ICON_BUTTON_CLASS}
							aria-label={previewLabel}
							title={previewLabel}
						>
							<Eye className="h-3.5 w-3.5" aria-hidden="true" />
						</button>
						<button
							type="button"
							disabled={loading || !url}
							onClick={handleDownload}
							className={ICON_BUTTON_CLASS}
							aria-label={downloadLabel}
							title={downloadLabel}
						>
							<FileDown className="h-3.5 w-3.5" aria-hidden="true" />
						</button>
					</div>
				</div>
				<div className="overflow-hidden rounded-xl border border-border/70">
					{loading ? (
						<div className="flex h-[300px] items-center justify-center bg-muted/30">
							<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
						</div>
					) : (
						<iframe
							src={url ? `${url}#toolbar=0&navpanes=0&scrollbar=0` : undefined}
							width="100%"
							height={300}
							style={{ display: 'block', border: 'none' }}
							title={title}
						/>
					)}
				</div>
			</div>

			<Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
				<DialogPortal>
					<DialogOverlay />
					<DialogPrimitive.Content
						className={cn(
							'fixed inset-0 z-[9999] flex flex-col',
							'data-[state=open]:animate-in data-[state=closed]:animate-out',
							'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
						)}
					>
						<DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
						<button
							type="button"
							onClick={() => setPreviewOpen(false)}
							className={cn(
								'absolute right-4 top-4 z-10 rounded-full p-2',
								'bg-black/50 text-white backdrop-blur-sm',
								'transition-opacity hover:bg-black/70',
								'focus:outline-none focus:ring-2 focus:ring-white/50'
							)}
						>
							<X className="h-5 w-5" />
							<span className="sr-only">{downloadLabel}</span>
						</button>
						{url && (
							<iframe
								src={`${url}#toolbar=0&navpanes=0`}
								width="100%"
								height="100%"
								style={{ display: 'block', border: 'none', flex: 1 }}
								title={title}
							/>
						)}
					</DialogPrimitive.Content>
				</DialogPortal>
			</Dialog>
		</>
	);
}
