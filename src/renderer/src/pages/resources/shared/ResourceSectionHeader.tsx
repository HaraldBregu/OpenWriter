import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, ListTree, Pencil, Trash2, Upload } from 'lucide-react';
import { AppButton, AppPageHeader, AppPageHeaderItems, AppPageHeaderTitle } from '@/components/app';

interface ResourceSectionHeaderProps {
	readonly title: string;
	readonly uploading: boolean;
	readonly uploadLabel: string;
	readonly onUpload: () => void;
	readonly editing: boolean;
	readonly onToggleEdit: () => void;
	readonly selectedCount: number;
	readonly removing: boolean;
	readonly onRemove: () => void;
	readonly indexing: boolean;
	readonly showIndexButton: boolean;
	readonly onIndex: () => void;
	readonly onOpenFolder: () => void;
}

export const ResourceSectionHeader = memo(function ResourceSectionHeader({
	title,
	uploading,
	uploadLabel,
	onUpload,
	editing,
	onToggleEdit,
	selectedCount,
	removing,
	onRemove,
	indexing,
	showIndexButton,
	onIndex,
	onOpenFolder,
}: ResourceSectionHeaderProps) {
	const { t } = useTranslation();

	return (
		<AppPageHeader>
			<AppPageHeaderTitle>{title}</AppPageHeaderTitle>
			<AppPageHeaderItems>
				{editing && selectedCount > 0 && (
					<AppButton variant="destructive" size="lg" disabled={removing} onClick={onRemove}>
						<Trash2 />
						{t('resources.removeWithCount', { count: selectedCount })}
					</AppButton>
				)}
				<AppButton variant="outline" size="lg" onClick={onOpenFolder} disabled={editing}>
					<FolderOpen />
				</AppButton>
				{showIndexButton && (
					<AppButton
						variant="outline"
						size="lg"
						onClick={onIndex}
						disabled={indexing || editing}
					>
						<ListTree />
					</AppButton>
				)}
				<AppButton
					variant="outline"
					size="lg"
					onClick={onUpload}
					disabled={uploading || editing}
					title={uploadLabel}
				>
					<Upload />
					{uploadLabel}
				</AppButton>
				<AppButton
					variant={editing ? 'secondary' : 'outline'}
					size="lg"
					onClick={onToggleEdit}
				>
					<Pencil />
				</AppButton>
			</AppPageHeaderItems>
		</AppPageHeader>
	);
});
