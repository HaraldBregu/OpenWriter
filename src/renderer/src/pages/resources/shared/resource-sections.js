import { File, FileText } from 'lucide-react';
import { FILES_EXTENSIONS } from '../../../../../shared/types';
export const RESOURCE_SECTION_ORDER = ['files', 'content'];
export const RESOURCE_SECTIONS = {
    files: {
        id: 'files',
        route: '/resources/images',
        titleKey: 'appLayout.files',
        emptyKey: 'resources.files.empty',
        loadingKey: 'resources.files.loading',
        uploadKey: 'resources.files.upload',
        searchPlaceholderKey: 'resources.files.searchPlaceholder',
        icon: File,
        uploadExtensions: [...FILES_EXTENSIONS],
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
};
const DOCUMENT_MIME_TYPES = new Set(['application/json', 'application/xml']);
export function getResourceSection(resource) {
    if (resource.mimeType.startsWith('text/') || DOCUMENT_MIME_TYPES.has(resource.mimeType)) {
        return 'content';
    }
    return 'files';
}
export function filterResourcesBySection(resources, sectionId) {
    return resources.filter((resource) => getResourceSection(resource) === sectionId);
}
export function getResourceSectionRoute(sectionId) {
    return RESOURCE_SECTIONS[sectionId].route;
}
