import { FolderOpen, LibraryBig } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getResourceSection, RESOURCE_SECTIONS } from '@/pages/resources/shared/resource-sections';
import { useAppSelector } from '@/store';
import { selectAllDocuments, selectResources } from '@/store/workspace';
import { APP_SEARCH_ACTIONS } from './constants';
import { buildAppSearchSections } from './search-items';

export function useAppSearchResults(query: string) {
	const { t } = useTranslation();
	const documents = useAppSelector(selectAllDocuments);
	const resources = useAppSelector(selectResources);
	const [extensionCommands, setExtensionCommands] = useState<
		Array<{ id: string; title: string; description: string; extensionName: string }>
	>([]);

	const loadExtensionCommands = useCallback(async () => {
		if (typeof window.extensions?.getCommands !== 'function') {
			setExtensionCommands([]);
			return;
		}

		try {
			const commands = await window.extensions.getCommands();
			setExtensionCommands(
				commands.map((command) => ({
					id: command.id,
					title: command.title,
					description: command.description,
					extensionName: command.extensionName,
				}))
			);
		} catch {
			setExtensionCommands([]);
		}
	}, []);

	useEffect(() => {
		void loadExtensionCommands();
		const unsubscribe = window.extensions?.onRegistryChanged
			? window.extensions.onRegistryChanged(() => {
					void loadExtensionCommands();
				})
			: undefined;
		return unsubscribe;
	}, [loadExtensionCommands]);

	const sections = buildAppSearchSections({
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
		actions: APP_SEARCH_ACTIONS,
		extensionCommands,
		icons: {
			document: FolderOpen,
			resource: LibraryBig,
		},
		labels: {
			actions: {
				title: t('search.quickActionsTitle', 'Quick actions'),
			},
			documents: {
				title: t('search.documentsTitle', 'Documents'),
			},
			resources: {
				title: t('search.resourcesTitle', 'Resources'),
			},
			extensions: {
				title: t('search.extensionsTitle', 'Extension commands'),
			},
		},
	});

	return {
		sections,
		totalCount: sections.reduce((count, section) => count + section.items.length, 0),
	};
}
