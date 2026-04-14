import { Loader2 } from 'lucide-react';

export function PreviewLoading() {
	return (
		<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
			<Loader2 className="mr-2 h-4 w-4 animate-spin" />
			Loading preview...
		</div>
	);
}

interface PreviewErrorProps {
	readonly message: string;
}

export function PreviewError({ message }: PreviewErrorProps) {
	return (
		<div className="flex h-full items-center justify-center">
			<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
				{message}
			</div>
		</div>
	);
}
