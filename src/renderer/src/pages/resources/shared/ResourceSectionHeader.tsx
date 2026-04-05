import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, ListTree, Pencil, Trash2, Upload, type LucideIcon } from 'lucide-react';
import { AppButton } from '@/components/app';

interface ResourceSectionHeaderProps {
	readonly title: string;
	readonly icon: LucideIcon;
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
	icon: Icon,
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
		<div className="border-b px-6 py-3 shrink-0">
			<div className="flex items-center gap-2">
				<Icon className="h-5 w-5 text-muted-foreground" />
				<h1 className="text-lg font-semibold">{title}</h1>
				<div className="ml-auto flex items-center gap-2">
					<AppButton
						size="icon"
						variant="outline"
						className="h-8 w-8"
						onClick={onOpenFolder}
						disabled={editing}
					>
						<FolderOpen className="h-3.5 w-3.5" />
					</AppButton>
					{showIndexButton && (
						<AppButton
							size="icon"
							variant="outline"
							className="h-8 w-8"
							onClick={onIndex}
							disabled={indexing || editing}
						>
							<ListTree className="h-3.5 w-3.5" />
						</AppButton>
					)}
					<AppButton
						size="icon"
						variant="outline"
						className="h-8 w-8"
						onClick={onUpload}
						disabled={uploading || editing}
						title={uploadLabel}
					>
						<Upload className="h-3.5 w-3.5" />
					</AppButton>
					{editing && selectedCount > 0 && (
						<AppButton size="sm" variant="destructive" disabled={removing} onClick={onRemove}>
							<Trash2 className="mr-1.5 h-3.5 w-3.5" />
							{t('resources.removeWithCount', { count: selectedCount })}
						</AppButton>
					)}
					<AppButton
						size="icon"
						variant={editing ? 'secondary' : 'outline'}
						className="h-8 w-8"
						onClick={onToggleEdit}
					>
						<Pencil className="h-3.5 w-3.5" />
					</AppButton>
				</div>
			</div>
		</div>
	);
});
