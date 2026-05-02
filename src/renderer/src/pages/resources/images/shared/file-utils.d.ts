import type { FileTypeFilter } from '../../../../../../shared/types';
export declare const MIME_TYPE_MARKDOWN = "text/markdown";
export declare const MIME_TYPE_TEXT = "text/plain";
export declare function formatShortDate(timestamp: number): string;
export declare function formatFileSize(bytes: number): string;
export declare function getFileExtension(name: string): string;
export declare function getFileNameWithoutExtension(name: string): string;
export declare function getMimeTypeLabel(mimeType: string): string;
export declare function matchesTypeFilter(mimeType: string, filter: FileTypeFilter): boolean;
