import type { ReactNode } from 'react';

interface DetailRowProps {
	readonly icon: ReactNode;
	readonly label: string;
	readonly value: ReactNode;
}

export function DetailRow({ icon, label, value }: DetailRowProps) {
	return (
		<div className="flex items-start gap-3">
			<span className="mt-0.5 text-muted-foreground">{icon}</span>
			<div className="min-w-0 flex-1">
				<p className="text-xs text-muted-foreground">{label}</p>
				<p className="truncate text-sm">{value}</p>
			</div>
		</div>
	);
}
