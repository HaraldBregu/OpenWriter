import { useCallback, useState } from 'react';
import { FileDown, Eye } from 'lucide-react';
import { usePDF, PDFViewer } from '@react-pdf/renderer';
import { useDocumentState } from '../../../hooks';
import { DocumentPdfTemplate, type DocumentPdfTemplateProps } from './DocumentPdfTemplate';
import { PdfPreviewDialog } from './PdfPreviewDialog';

export interface PdfExportSectionProps {
	readonly sectionClassName: string;
	readonly exportLabel: string;
	readonly downloadLabel: string;
	readonly previewLabel: string;
}

const ICON_BUTTON_CLASS =
	'rounded-full p-1 text-muted-foreground/70 transition-colors hover:bg-accent/75 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

/** Extra pixels cropped on each side to hide the PDF page drop-shadow and scrollbar. */
const CROP = 20;
const PREVIEW_HEIGHT = 300;

export function PdfExportSection({
	sectionClassName,
	exportLabel,
	downloadLabel,
	previewLabel,
}: PdfExportSectionProps): React.ReactElement {
	const { title } = useDocumentState();

	const [{ loading: downloadLoading, url }] = usePDF({
		document: <DocumentPdfTemplate />,
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
							onClick={() => setPreviewOpen(true)}
							className={ICON_BUTTON_CLASS}
							aria-label={previewLabel}
							title={previewLabel}
						>
							<Eye className="h-3.5 w-3.5" aria-hidden="true" />
						</button>
						<button
							type="button"
							disabled={downloadLoading || !url}
							onClick={handleDownload}
							className={ICON_BUTTON_CLASS}
							aria-label={downloadLabel}
							title={downloadLabel}
						>
							<FileDown className="h-3.5 w-3.5" aria-hidden="true" />
						</button>
					</div>
				</div>

				<div className="overflow-hidden rounded-xl" style={{ height: PREVIEW_HEIGHT }}>
					<div
						style={{
							marginTop: -CROP,
							marginLeft: -CROP,
							width: `calc(100% + ${CROP * 2}px)`,
							height: PREVIEW_HEIGHT + CROP * 2,
						}}
					>
						<PDFViewer width="100%" height={PREVIEW_HEIGHT + CROP * 2} showToolbar={false}>
							<DocumentPdfTemplate />
						</PDFViewer>
					</div>
				</div>
			</div>

			<PdfPreviewDialog
				open={previewOpen}
				onOpenChange={setPreviewOpen}
				closeLabel={downloadLabel}
			/>
		</>
	);
}
