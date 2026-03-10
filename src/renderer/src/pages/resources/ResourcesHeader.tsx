import { Library, ListTree, Pencil, Trash2, Upload } from 'lucide-react';
import { AppButton } from '../../components/app';

interface ResourcesHeaderProps {
	uploading: boolean;
	onUpload: () => void;
	editing: boolean;
	onToggleEdit: () => void;
	selectedCount: number;
	removing: boolean;
	onRemove: () => void;
	indexing: boolean;
	onIndex: () => void;
}

export function ResourcesHeader({
	uploading,
	onUpload,
	editing,
	onToggleEdit,
	selectedCount,
	removing,
	onRemove,
	indexing,
	onIndex,
}: ResourcesHeaderProps) {
	return (
		<div className="px-6 py-3 border-b shrink-0">
			<div className="flex items-center gap-2">
				<Library className="h-5 w-5 text-muted-foreground" />
				<h1 className="text-lg font-semibold">Resources</h1>
				<div className="ml-auto flex items-center gap-2">
					<AppButton
						size="icon"
						variant="outline"
						className="h-8 w-8"
						onClick={onUpload}
						disabled={uploading || editing}
					>
						<Upload className="h-3.5 w-3.5" />
					</AppButton>
					{editing && selectedCount > 0 && (
						<AppButton size="sm" variant="destructive" disabled={removing} onClick={onRemove}>
							<Trash2 className="h-3.5 w-3.5 mr-1.5" />
							Remove ({selectedCount})
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
}
