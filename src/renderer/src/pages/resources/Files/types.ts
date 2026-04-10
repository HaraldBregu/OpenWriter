export type ViewMode = 'list' | 'grid';
export type FileTypeFilter = 'all' | 'json' | 'markdown' | 'text' | 'pdf';
export type SortKey = 'name' | 'createdAt' | 'mimeType' | 'size';
export type SortDirection = 'none' | 'asc' | 'desc';

export const FILE_TYPE_FILTERS: { value: FileTypeFilter; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'json', label: 'JSON' },
	{ value: 'markdown', label: 'Markdown' },
	{ value: 'text', label: 'Text' },
	{ value: 'pdf', label: 'PDF' },
];
