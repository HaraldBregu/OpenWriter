export type SortKey = 'name' | 'mimeType' | 'size' | 'importedAt' | 'lastModified';
export type SortDirection = 'none' | 'asc' | 'desc';

export const ALL_TYPES_VALUE = 'all';

export type KnowledgeBaseStatus = 'building' | 'ready' | 'error' | 'empty';

export interface KnowledgeBase {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly embeddingModel: string;
	readonly embeddingProvider: string;
	readonly documentCount: number;
	readonly chunkCount: number;
	readonly status: KnowledgeBaseStatus;
	readonly createdAt: number;
	readonly updatedAt: number;
	readonly error?: string;
}
