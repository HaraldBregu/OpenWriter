import React, { useId, useState } from 'react';

export function CollapsibleSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
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
				<span aria-hidden="true" className="text-muted-foreground text-xs">
					{open ? '▲' : '▼'}
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
