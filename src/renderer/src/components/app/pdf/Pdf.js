import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { PDFViewer, } from '@embedpdf/react-pdf-viewer';
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
export const Pdf = forwardRef(function Pdf({ src, className, style, disabledCategories = DEFAULT_DISABLED_CATEGORIES, themePreference = 'system', config, onInit, onReady, }, ref) {
    return (_jsx(PDFViewer, { ref: ref, className: className, style: style, onInit: onInit, onReady: onReady, config: {
            ...config,
            src,
            disabledCategories: [...disabledCategories],
            theme: { preference: themePreference, ...config?.theme },
        } }));
});
