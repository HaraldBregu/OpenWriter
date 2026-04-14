import { forwardRef } from 'react';
import type { CSSProperties } from 'react';
import {
	PDFViewer as EmbedPdfViewer,
	type PDFViewerProps as EmbedPdfViewerProps,
	type PDFViewerRef,
} from '@embedpdf/react-pdf-viewer';

const DEFAULT_DISABLED_CATEGORIES = [
	'annotation',
	'annotation-highlight',
	'annotation-markup',
	'print',
	'redaction',
	'zoom',
	'document-print',
	'export',
	'document-export',
	'tools',
	'selection',
	'history',
];

export interface PDFProps {
	readonly src: string;
	readonly className?: string;
	readonly style?: CSSProperties;
	readonly disabledCategories?: readonly string[];
	readonly themePreference?: 'system' | 'light' | 'dark';
	readonly config?: Omit<NonNullable<EmbedPdfViewerProps['config']>, 'src'>;
	readonly onInit?: EmbedPdfViewerProps['onInit'];
	readonly onReady?: EmbedPdfViewerProps['onReady'];
}

export const PDF = forwardRef<PDFViewerRef, PDFProps>(function PDF(
	{
		src,
		className,
		style,
		disabledCategories = DEFAULT_DISABLED_CATEGORIES,
		themePreference = 'system',
		config,
		onInit,
		onReady,
	},
	ref,
) {
	return (
		<EmbedPdfViewer
			ref={ref}
			className={className}
			style={style}
			onInit={onInit}
			onReady={onReady}
			config={{
				...config,
				src,
				disabledCategories: [...disabledCategories],
				theme: { preference: themePreference, ...config?.theme },
			}}
		/>
	);
});

export type { PDFViewerRef as PdfViewerRef } from '@embedpdf/react-pdf-viewer';
