import { File, Upload } from 'lucide-react';
import type { ReactElement } from 'react';
import { Button } from '@/components/ui/Button';

interface EmptyStateProps {
	readonly uploading: boolean;
	readonly onUpload: () => void;
}

export function EmptyState({ uploading, onUpload }: EmptyStateProps): ReactElement {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
			<div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
				<File className="h-7 w-7 text-muted-foreground" />
			</div>
			<div className="space-y-1">
				<p className="font-medium text-sm">No files yet</p>
				<p className="text-sm text-muted-foreground">Upload files to get started</p>
			</div>
			<Button onClick={onUpload} disabled={uploading} size="sm">
				<Upload />
				Upload files
			</Button>
		</div>
	);
}
