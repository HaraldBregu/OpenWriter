import { useCallback } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { usePDF } from '@react-pdf/renderer';
import type { OutputFileMetadata } from '../../../../../../../shared/types';
import { DocumentPdfTemplate } from './DocumentPdfTemplate';

export interface PdfExportSectionProps {
	readonly title: string;
	readonly content: string;
	readonly metadata: OutputFileMetadata;
	readonly sectionClassName: string;
	readonly exportLabel: string;
	readonly downloadLabel: string;
}

export function PdfExportSection({
	title,
	content,
	metadata,
	sectionClassName,
	exportLabel,
	downloadLabel,
}: PdfExportSectionProps): React.ReactElement {
	const [{ loading, url }] = usePDF({
		document: <DocumentPdfTemplate title={title} content={content} metadata={metadata} />,
	});

	const handleDownload = useCallback(() => {
		if (!url) return;
		const a = document.createElement('a');
		a.href = url;
		a.download = `${title || 'document'}.pdf`;
		a.click();
	}, [url, title]);

	return (
		<div className={sectionClassName}>
			<div className="mb-3 flex items-center justify-between gap-2">
				<span className="text-xs font-medium text-muted-foreground/70">{exportLabel}</span>
				<button
					type="button"
					disabled={loading || !url}
					onClick={handleDownload}
					className="rounded-full p-1 text-muted-foreground/70 transition-colors hover:bg-accent/75 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
					aria-label={downloadLabel}
					title={downloadLabel}
				>
					<FileDown className="h-3.5 w-3.5" aria-hidden="true" />
				</button>
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
	);
}
