import { memo } from 'react';
import { Upload, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ResourceEmptyStateProps {
	readonly icon: LucideIcon;
	readonly message: string;
	readonly uploadLabel: string;
	readonly uploading: boolean;
	readonly onUpload: () => void;
}

export const ResourceEmptyState = memo(function ResourceEmptyState({
	icon: Icon,
	message,
	uploadLabel,
	uploading,
	onUpload,
}: ResourceEmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
			<Icon className="mb-3 h-10 w-10 opacity-40" />
			<p className="text-sm">{message}</p>
			<AppButton
				variant="outline"
				size="sm"
				className="mt-4"
				onClick={onUpload}
				disabled={uploading}
			>
				<Upload className="mr-1.5 h-3.5 w-3.5" />
				{uploadLabel}
			</AppButton>
		</div>
	);
});
