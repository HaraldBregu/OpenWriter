export type ViewMode = 'list' | 'grid';
export type FileTypeFilter = 'all' | 'image' | 'pdf' | 'json';
export type SortKey = 'name' | 'createdAt' | 'mimeType' | 'size';
export type SortDirection = 'none' | 'asc' | 'desc';

export const FILE_TYPE_FILTERS: { value: FileTypeFilter; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'image', label: 'Images' },
	{ value: 'pdf', label: 'PDF' },
	{ value: 'json', label: 'JSON' },
];
