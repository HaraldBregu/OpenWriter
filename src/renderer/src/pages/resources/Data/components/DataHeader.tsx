import { FolderOpen, ListTree, Pencil, Trash2, Upload } from 'lucide-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
	AppButton,
	AppPageHeader,
	AppPageHeaderItems,
	AppPageHeaderTitle,
} from '@/components/app';
import { RESOURCE_SECTIONS } from '../../shared/resource-sections';
import { useDataContext } from '../context/DataContext';

export function DataHeader(): ReactElement {
	const { t } = useTranslation();
	const section = RESOURCE_SECTIONS.data;
	const {
		editing,
		uploading,
		removing,
		indexing,
		selected,
		handleDelete,
		handleOpenResourcesFolder,
		handleUpload,
		handleToggleEdit,
		handleIndex,
	} = useDataContext();

	return (
		<AppPageHeader>
			<AppPageHeaderTitle>{t(section.titleKey)}</AppPageHeaderTitle>
			<AppPageHeaderItems>
				{editing && selected.size > 0 && (
					<AppButton variant="destructive" size="lg" disabled={removing} onClick={handleDelete}>
						<Trash2 />
						{t('resources.removeWithCount', { count: selected.size })}
					</AppButton>
				)}
				<AppButton
					variant="outline"
					size="lg"
					onClick={handleOpenResourcesFolder}
					disabled={editing}
				>
					<FolderOpen />
				</AppButton>
				<AppButton
					variant="outline"
					size="lg"
					onClick={handleIndex}
					disabled={indexing || editing}
				>
					<ListTree />
				</AppButton>
				<AppButton
					variant="outline"
					size="lg"
					onClick={handleUpload}
					disabled={uploading || editing}
					title={t(section.uploadKey)}
				>
					<Upload />
					{t(section.uploadKey)}
				</AppButton>
				<AppButton
					variant={editing ? 'secondary' : 'outline'}
					size="lg"
					onClick={handleToggleEdit}
				>
					<Pencil />
				</AppButton>
			</AppPageHeaderItems>
		</AppPageHeader>
	);
}
