import { Bot, FolderOpen, Home, type LucideIcon } from 'lucide-react';
import type { SearchActionDefinition } from './types';
import { RESOURCE_SECTIONS } from '../resources/shared/resource-sections';

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
		id: 'resources-content',
		title: 'Open Content',
		description: 'Browse imported documents and manage indexing.',
		href: RESOURCE_SECTIONS.content.route,
		icon: RESOURCE_SECTIONS.content.icon,
		meta: 'Route',
	},
{
		id: 'resources-files',
		title: 'Open Files',
		description: 'Browse imported files and binary assets.',
		href: RESOURCE_SECTIONS.files.route,
		icon: RESOURCE_SECTIONS.files.icon,
		meta: 'Route',
	},
	{
		id: 'resources-data',
		title: 'Open Data',
		description: 'Browse imported data files and structured datasets.',
		href: RESOURCE_SECTIONS.data.route,
		icon: RESOURCE_SECTIONS.data.icon,
		meta: 'Route',
	},
	{
		id: 'documents',
		title: 'Browse Writings',
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
	resources: RESOURCE_SECTIONS.content.icon,
};
