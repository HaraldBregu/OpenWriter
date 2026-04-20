import type { LucideIcon } from 'lucide-react';

export type AppSearchResultKind = 'action' | 'document' | 'resource';

export interface AppSearchResultItem {
	id: string;
	kind: AppSearchResultKind;
	title: string;
	description: string;
	meta: string;
	href: string;
	icon: LucideIcon;
}

export interface AppSearchResultSection {
	id: 'actions' | 'documents' | 'resources';
	title: string;
	items: AppSearchResultItem[];
}

export interface AppSearchActionDefinition {
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
	href: string;
	categoryLabel: string;
	icon: LucideIcon;
}
