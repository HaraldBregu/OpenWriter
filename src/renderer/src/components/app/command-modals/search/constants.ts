import { Database, FileText, FolderOpen, Home, LibraryBig, Settings } from 'lucide-react';
import type { AppSearchActionDefinition } from './types';
import { RESOURCE_SECTIONS } from '@/pages/resources/shared/resource-sections';

export const APP_SEARCH_RESULTS_PER_SECTION = 6;

export const APP_SEARCH_RESULT_KIND_LABELS = {
	action: 'Action',
	document: 'Document',
	resource: 'Resource',
} as const;

export const APP_SEARCH_ACTIONS: AppSearchActionDefinition[] = [
	{
		id: 'welcome',
		title: 'Open Welcome',
		description: 'Go to the workspace landing page.',
		href: '/',
		icon: FileText,
		meta: 'Route',
	},
	{
		id: 'home',
		title: 'Open Home',
		description: 'Jump to the workspace home screen.',
		href: '/home',
		icon: Home,
		meta: 'Route',
	},
	{
		id: 'settings',
		title: 'Open Settings',
		description: 'Manage workspace, providers, editor, and system settings.',
		href: '/settings/general',
		icon: Settings,
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
		icon: Database,
		meta: 'Route',
	},
];

export const APP_SEARCH_SECTION_ICONS = {
	actions: Home,
	documents: FolderOpen,
	resources: LibraryBig,
} as const;
