import { Bot, FolderOpen, Home, LibraryBig, type LucideIcon } from 'lucide-react';
import type { SearchActionDefinition } from './types';

export const SEARCH_RESULTS_PER_SECTION = 6;

export const SEARCH_RESULT_KIND_LABELS: Record<string, string> = {
	action: 'Action',
	document: 'Document',
	resource: 'Resource',
};

export const SEARCH_ACTIONS: SearchActionDefinition[] = [
	{
		id: 'home',
		title: 'Open Home',
		description: 'Jump back to the workspace home screen.',
		href: '/home',
		icon: Home,
		meta: 'Route',
	},
	{
		id: 'library',
		title: 'Open Library',
		description: 'Browse imported resources and manage indexing.',
		href: '/library',
		icon: LibraryBig,
		meta: 'Route',
	},
	{
		id: 'documents',
		title: 'Browse Documents',
		description: 'Open recent writing outputs from your workspace.',
		href: '/home',
		icon: FolderOpen,
		meta: 'Route',
	},
	{
		id: 'agents',
		title: 'Open Agents',
		description: 'Go to the agent workspace and chat tools.',
		href: '/agents',
		icon: Bot,
		meta: 'Route',
	},
];

export const SEARCH_SECTION_ICONS: Record<string, LucideIcon> = {
	actions: Home,
	documents: FolderOpen,
	resources: LibraryBig,
};
