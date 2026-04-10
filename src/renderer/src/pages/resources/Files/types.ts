export type ViewMode = 'list' | 'grid';
export type FileTypeFilter = 'all' | 'image' | 'pdf' | 'text' | 'other';
export type SortKey = 'name' | 'createdAt' | 'mimeType' | 'size';
export type SortDirection = 'none' | 'asc' | 'desc';

export const MIME_PREFIX_IMAGE = 'image/';
export const MIME_PREFIX_TEXT = 'text/';
export const MIME_TYPE_PDF = 'application/pdf';

export const FILE_TYPE_FILTERS: { value: FileTypeFilter; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'image', label: 'Images' },
	{ value: 'pdf', label: 'PDF' },
	{ value: 'text', label: 'Text' },
	{ value: 'other', label: 'Other' },
];
