import { File, FolderOpen, ImageIcon, type LucideIcon } from 'lucide-react';
import type { ResourceInfo } from '../../../../../shared/types';

export type ResourceSectionId = 'documents' | 'images' | 'files';

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

export const RESOURCE_SECTION_ORDER: ResourceSectionId[] = ['documents', 'images', 'files'];

export const RESOURCE_SECTIONS: Record<ResourceSectionId, ResourceSectionConfig> = {
	documents: {
		id: 'documents',
		route: '/resources/documents',
		titleKey: 'appLayout.documents',
		emptyKey: 'resources.documents.empty',
		loadingKey: 'resources.documents.loading',
		uploadKey: 'resources.documents.upload',
		searchPlaceholderKey: 'resources.documents.searchPlaceholder',
		icon: FolderOpen,
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
		return 'documents';
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
