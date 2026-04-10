import { FolderOpen, Pencil, Trash2, Upload } from 'lucide-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { RESOURCE_SECTIONS } from '../../shared/resource-sections';
import { useContentContext } from '../context/ContentContext';

export function ContentHeader(): ReactElement {
	const { t } = useTranslation();
	const section = RESOURCE_SECTIONS.content;
	const {
		editing,
		uploading,
		removing,
		selected,
		handleDelete,
		handleOpenResourcesFolder,
		handleUpload,
		handleToggleEdit,
	} = useContentContext();

	return (
		<div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
			<h1 className="text-xl font-bold">{t(section.titleKey)}</h1>
			<div className="flex items-center gap-2">
				{editing && selected.size > 0 && (
					<Button variant="destructive" size="lg" disabled={removing} onClick={handleDelete}>
						<Trash2 />
						{t('resources.removeWithCount', { count: selected.size })}
					</Button>
				)}
				<Button variant="outline" size="lg" onClick={handleOpenResourcesFolder} disabled={editing}>
					<FolderOpen />
				</Button>
				<Button
					variant="outline"
					size="lg"
					onClick={handleUpload}
					disabled={uploading || editing}
					title={t(section.uploadKey)}
				>
					<Upload />
					{t(section.uploadKey)}
				</Button>
				<Button variant={editing ? 'secondary' : 'outline'} size="lg" onClick={handleToggleEdit}>
					<Pencil />
				</Button>
			</div>
		</div>
	);
}
