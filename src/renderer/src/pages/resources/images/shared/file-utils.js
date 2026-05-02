import { MIME_PREFIX_IMAGE, MIME_TYPE_JSON, MIME_TYPE_PDF, } from '../../shared/resource-preview-utils';
export const MIME_TYPE_MARKDOWN = 'text/markdown';
export const MIME_TYPE_TEXT = 'text/plain';
export function formatShortDate(timestamp) {
    return new Date(timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
}
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = 1024 * 1024;
export function formatFileSize(bytes) {
    if (bytes < BYTES_PER_KB)
        return `${bytes} B`;
    if (bytes < BYTES_PER_MB)
        return `${(bytes / BYTES_PER_KB).toFixed(1)} KB`;
    return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
}
export function getFileExtension(name) {
    const dotIndex = name.lastIndexOf('.');
    return dotIndex >= 0 ? name.slice(dotIndex + 1).toUpperCase() : '';
}
export function getFileNameWithoutExtension(name) {
    const dotIndex = name.lastIndexOf('.');
    return dotIndex >= 0 ? name.slice(0, dotIndex) : name;
}
export function getMimeTypeLabel(mimeType) {
    if (mimeType.startsWith(MIME_PREFIX_IMAGE))
        return 'Image';
    if (mimeType.startsWith('video/'))
        return 'Video';
    if (mimeType.startsWith('audio/'))
        return 'Audio';
    if (mimeType === MIME_TYPE_PDF)
        return 'PDF';
    if (mimeType === MIME_TYPE_JSON)
        return 'JSON';
    return 'File';
}
export function matchesTypeFilter(mimeType, filter) {
    switch (filter) {
        case 'image':
            return mimeType.startsWith(MIME_PREFIX_IMAGE);
        case 'video':
            return mimeType.startsWith('video/');
        case 'audio':
            return mimeType.startsWith('audio/');
        case 'json':
            return mimeType === MIME_TYPE_JSON;
        case 'markdown':
            return mimeType === MIME_TYPE_MARKDOWN;
        case 'text':
            return mimeType === MIME_TYPE_TEXT;
        case 'pdf':
            return mimeType === MIME_TYPE_PDF;
        default:
            return true;
    }
}
