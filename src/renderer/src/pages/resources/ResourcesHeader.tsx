import { Library, Pencil, Trash2, Upload } from 'lucide-react';
import { AppButton } from '../../components/app';

interface ResourcesHeaderProps {
	uploading: boolean;
	onUpload: () => void;
	editing: boolean;
	onToggleEdit: () => void;
	selectedCount: number;
	removing: boolean;
	onRemove: () => void;
}

export function ResourcesHeader({
	uploading,
	onUpload,
	editing,
	onToggleEdit,
	selectedCount,
	removing,
	onRemove,
}: ResourcesHeaderProps) {
	return (
		<div className="px-6 py-3 border-b shrink-0">
			<div className="flex items-center gap-2">
				<Library className="h-5 w-5 text-muted-foreground" />
				<h1 className="text-lg font-semibold">Resources</h1>
				<div className="ml-auto flex items-center gap-2">
					{editing && selectedCount > 0 && (
						<AppButton size="sm" variant="destructive" disabled={removing} onClick={onRemove}>
							<Trash2 className="h-3.5 w-3.5 mr-1.5" />
							Remove ({selectedCount})
						</AppButton>
					)}
					<AppButton size="icon" variant={editing ? 'secondary' : 'outline'} className="h-8 w-8" onClick={onToggleEdit}>
						<Pencil className="h-3.5 w-3.5" />
					</AppButton>
					{!editing && (
						<AppButton size="sm" onClick={onUpload} disabled={uploading}>
							<Upload className="h-3.5 w-3.5 mr-1.5" />
							{uploading ? 'Uploading\u2026' : 'Upload'}
						</AppButton>
					)}
				</div>
			</div>
		</div>
	);
}
