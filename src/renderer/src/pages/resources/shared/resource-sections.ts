import { File, Film, ImageIcon, type LucideIcon } from 'lucide-react';
import type { ResourceInfo } from '../../../../../shared/types';

export type ResourceSectionId = 'media' | 'images' | 'files';

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

export const RESOURCE_SECTION_ORDER: ResourceSectionId[] = ['media', 'images', 'files'];

export const RESOURCE_SECTIONS: Record<ResourceSectionId, ResourceSectionConfig> = {
	media: {
		id: 'media',
		route: '/resources/documents',
		titleKey: 'appLayout.media',
		emptyKey: 'resources.media.empty',
		loadingKey: 'resources.media.loading',
		uploadKey: 'resources.media.upload',
		searchPlaceholderKey: 'resources.media.searchPlaceholder',
		icon: Film,
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
	files: {
		id: 'files',
		route: '/resources/files',
		titleKey: 'appLayout.files',
		emptyKey: 'resources.files.empty',
		loadingKey: 'resources.files.loading',
		uploadKey: 'resources.files.upload',
		searchPlaceholderKey: 'resources.files.searchPlaceholder',
		icon: File,
		uploadExtensions: [
			'.pdf',
			'.doc',
			'.docx',
			'.rtf',
			'.xls',
			'.xlsx',
			'.ppt',
			'.pptx',
			'.zip',
			'.rar',
			'.tar',
			'.gz',
			'.7z',
			'.mp3',
			'.wav',
			'.ogg',
			'.flac',
			'.m4a',
			'.mp4',
			'.mov',
			'.avi',
			'.mkv',
			'.webm',
		],
		supportsIndexing: false,
	},
};

const DOCUMENT_MIME_TYPES = new Set(['application/json', 'application/xml']);

export function getResourceSection(resource: ResourceInfo): ResourceSectionId {
	if (resource.mimeType.startsWith('image/')) {
		return 'images';
	}

	if (resource.mimeType.startsWith('text/') || DOCUMENT_MIME_TYPES.has(resource.mimeType)) {
		return 'media';
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
