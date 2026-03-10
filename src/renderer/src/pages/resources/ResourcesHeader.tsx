import { Library, Upload } from 'lucide-react';
import { AppButton } from '../../components/app';

interface ResourcesHeaderProps {
	uploading: boolean;
	onUpload: () => void;
}

export function ResourcesHeader({ uploading, onUpload }: ResourcesHeaderProps) {
	return (
		<div className="px-6 py-3 border-b shrink-0">
			<div className="flex items-center gap-2">
				<Library className="h-5 w-5 text-muted-foreground" />
				<h1 className="text-lg font-semibold">Resources</h1>
				<div className="ml-auto">
					<AppButton size="sm" onClick={onUpload} disabled={uploading}>
						<Upload className="h-3.5 w-3.5 mr-1.5" />
						{uploading ? 'Uploading\u2026' : 'Upload'}
					</AppButton>
				</div>
			</div>
		</div>
	);
}
