import type { LucideIcon } from 'lucide-react';

export type SearchResultKind = 'action' | 'document' | 'resource';

export interface SearchResultItem {
	id: string;
	kind: SearchResultKind;
	title: string;
	description: string;
	meta: string;
	href: string;
	icon: LucideIcon;
}

export interface SearchResultSection {
	id: 'actions' | 'documents' | 'resources';
	title: string;
	description: string;
	emptyCopy: string;
	items: SearchResultItem[];
}

export interface SearchActionDefinition {
	id: string;
	title: string;
	description: string;
	href: string;
	icon: LucideIcon;
	meta: string;
}

export interface SearchableDocument {
	id: string;
	title: string;
	path: string;
	updatedAt: number;
}

export interface SearchableResource {
	id: string;
	name: string;
	path: string;
	mimeType: string;
	importedAt: number;
	lastModified: number;
}
