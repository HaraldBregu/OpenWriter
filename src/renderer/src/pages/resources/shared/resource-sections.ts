import { Database, File, FileText, type LucideIcon } from 'lucide-react';
import { RESOURCES_FILES_EXTENSIONS, type ResourceInfo } from '../../../../../shared/types';

export type ResourceSectionId = 'files' | 'content' | 'data';

export interface ResourceSectionConfig {
	readonly id: ResourceSectionId;
	readonly route: string;
	readonly titleKey: string;
	readonly emptyKey: string;
	readonly loadingKey: string;
	readonly uploadKey: string;
	readonly searchPlaceholderKey: string;
	readonly icon: LucideIcon;
	readonly uploadExtensions: string[];
	readonly supportsIndexing: boolean;
}

export const RESOURCE_SECTION_ORDER: ResourceSectionId[] = ['files', 'content', 'data'];

export const RESOURCE_SECTIONS: Record<ResourceSectionId, ResourceSectionConfig> = {
	files: {
		id: 'files',
		route: '/resources/files',
		titleKey: 'appLayout.files',
		emptyKey: 'resources.files.empty',
		loadingKey: 'resources.files.loading',
		uploadKey: 'resources.files.upload',
		searchPlaceholderKey: 'resources.files.searchPlaceholder',
		icon: File,
		uploadExtensions: [...RESOURCES_FILES_EXTENSIONS],
		supportsIndexing: false,
	},
	content: {
		id: 'content',
		route: '/resources/content',
		titleKey: 'appLayout.content',
		emptyKey: 'resources.content.empty',
		loadingKey: 'resources.content.loading',
		uploadKey: 'resources.content.upload',
		searchPlaceholderKey: 'resources.content.searchPlaceholder',
		icon: FileText,
		uploadExtensions: ['.txt', '.md', '.html', '.csv', '.json'],
		supportsIndexing: true,
	},
	images: {
		id: 'images',
		route: '/resources/images',
		titleKey: 'appLayout.images',
		emptyKey: 'resources.images.empty',
		loadingKey: 'resources.images.loading',
		uploadKey: 'resources.images.upload',
		searchPlaceholderKey: 'resources.images.searchPlaceholder',
		icon: ImageIcon,
		uploadExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'],
		supportsIndexing: false,
	},
	data: {
		id: 'data',
		route: '/resources/data',
		titleKey: 'appLayout.data',
		emptyKey: 'resources.data.empty',
		loadingKey: 'resources.data.loading',
		uploadKey: 'resources.data.upload',
		searchPlaceholderKey: 'resources.data.searchPlaceholder',
		icon: Database,
		uploadExtensions: ['.csv', '.json', '.xml', '.yaml', '.yml', '.tsv', '.parquet', '.sqlite'],
		supportsIndexing: true,
	},
};

const DOCUMENT_MIME_TYPES = new Set(['application/json', 'application/xml']);

export function getResourceSection(resource: ResourceInfo): ResourceSectionId {
	if (resource.mimeType.startsWith('image/')) {
		return 'images';
	}

	if (resource.mimeType.startsWith('text/') || DOCUMENT_MIME_TYPES.has(resource.mimeType)) {
		return 'content';
	}

	return 'files';
}

export function filterResourcesBySection(
	resources: ResourceInfo[],
	sectionId: ResourceSectionId
): ResourceInfo[] {
	return resources.filter((resource) => getResourceSection(resource) === sectionId);
}

export function getResourceSectionRoute(sectionId: ResourceSectionId): string {
	return RESOURCE_SECTIONS[sectionId].route;
}
