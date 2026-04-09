import React, { useId, useState } from 'react';

interface CollapsibleSectionProps {
	readonly title: string;
	readonly children: React.ReactNode;
}

export function CollapsibleSection({ title, children }: CollapsibleSectionProps) {
	const [open, setOpen] = useState(false);
	const panelId = useId();

	return (
		<div>
			<button
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				aria-controls={panelId}
				className="flex w-full items-center justify-between px-6 py-4 text-sm font-normal hover:bg-muted/40 transition-colors"
			>
				<span>{title}</span>
				<span className="text-muted-foreground text-xs" aria-hidden="true">
					{open ? '\u25B2' : '\u25BC'}
				</span>
			</button>
			{open && (
				<div id={panelId} className="border-t">
					{children}
				</div>
			)}
		</div>
	);
}
