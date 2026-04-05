import { useTranslation } from 'react-i18next';
import { FolderOpen, LibraryBig } from 'lucide-react';
import { useAppSelector } from '@/store';
import { getResourceSection, RESOURCE_SECTIONS } from '@/pages/resources/shared/resource-sections';
import { selectAllDocuments } from '@/store/documents';
import { selectResources } from '@/store/workspace';
import { SEARCH_ACTIONS } from '../constants';
import { buildSearchSections } from '../services/search-items';

export function useSearchResults(query: string) {
	const { t } = useTranslation();
	const documents = useAppSelector(selectAllDocuments);
	const resources = useAppSelector(selectResources);

	const sections = buildSearchSections({
		query,
		documents: documents.map((document) => ({
			id: document.id,
			title: document.title || t('sidebar.untitledWriting', 'Untitled'),
			path: document.path,
			updatedAt: document.updatedAt,
		})),
		resources: resources.map((resource) => {
			const sectionId = getResourceSection(resource);
			const section = RESOURCE_SECTIONS[sectionId];

			return {
				id: resource.id,
				name: resource.name,
				path: resource.path,
				mimeType: resource.mimeType,
				importedAt: resource.importedAt,
				lastModified: resource.lastModified,
				href: section.route,
				categoryLabel: t(section.titleKey),
				icon: section.icon,
			};
		}),
		actions: SEARCH_ACTIONS,
		icons: {
			document: FolderOpen,
			resource: LibraryBig,
		},
		labels: {
			actions: {
				title: t('search.quickActionsTitle', 'Quick actions'),
				description: t(
					'search.quickActionsDescription',
					'Common routes and entry points you can jump to immediately.'
				),
				emptyCopy: t('search.quickActionsEmpty', 'No quick actions are available for this search.'),
			},
			documents: {
				title: t('search.documentsTitle', 'Documents'),
				description: t(
					'search.documentsDescription',
					'Recent writing outputs matched against title and path.'
				),
				emptyCopy: t('search.documentsEmpty', 'No documents in this workspace yet.'),
			},
			resources: {
				title: t('search.resourcesTitle', 'Resources'),
				description: t(
					'search.resourcesDescription',
					'Imported files matched against file name, type, and path.'
				),
				emptyCopy: t('search.resourcesEmpty', 'No imported resources yet.'),
			},
		},
	});

	return {
		sections,
		totalCount: sections.reduce((count, section) => count + section.items.length, 0),
	};
}
