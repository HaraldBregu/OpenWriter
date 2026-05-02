import type { CSSProperties } from 'react';
import { type PDFViewerProps as EmbedPdfViewerProps, type PDFViewerRef } from '@embedpdf/react-pdf-viewer';
export interface PdfProps {
    readonly src: string;
    readonly className?: string;
    readonly style?: CSSProperties;
    readonly disabledCategories?: readonly string[];
    readonly themePreference?: 'system' | 'light' | 'dark';
    readonly config?: Omit<NonNullable<EmbedPdfViewerProps['config']>, 'src'>;
    readonly onInit?: EmbedPdfViewerProps['onInit'];
    readonly onReady?: EmbedPdfViewerProps['onReady'];
}
export declare const Pdf: import("react").ForwardRefExoticComponent<PdfProps & import("react").RefAttributes<PDFViewerRef>>;
export type { PDFViewerRef as PdfRef } from '@embedpdf/react-pdf-viewer';
