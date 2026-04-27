import React from 'react';
import { Card } from '@/components/ui/Card';
import type { ImageEntry } from '../../../../../../shared/types';

function toLocalResourceUrl(filePath: string): string {
	const normalized = filePath.replace(/\\/g, '/');
	const urlPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
	return `local-resource://localhost${urlPath}`;
}

export interface ImagesMenuProps {
	images: ImageEntry[];
	selectedIndex: number;
	onSelectIndex: (index: number) => void;
	onPick: (image: ImageEntry) => void;
	onMouseEnter?: () => void;
}

export function ImagesMenu({
	images,
	selectedIndex,
	onSelectIndex,
	onPick,
	onMouseEnter,
}: ImagesMenuProps): React.JSX.Element {
	return (
		<Card
			size="sm"
			className="absolute left-full top-0 ml-1 z-50 p-2! m-0! w-[220px] max-h-[220px] overflow-y-auto"
			onMouseEnter={onMouseEnter}
		>
			{images.length > 0 ? (
				<div className="flex flex-wrap gap-1">
					{images.map((img, i) => (
						<button
							type="button"
							key={img.id}
							className={
								'group relative h-[36px] w-[36px] overflow-hidden rounded-md border bg-accent/45 cursor-pointer dark:bg-muted/40 ' +
								(i === selectedIndex
									? 'border-foreground ring-2 ring-ring'
									: 'border-border/70')
							}
							title={img.name}
							onMouseEnter={() => onSelectIndex(i)}
							onMouseDown={(e) => {
								e.preventDefault();
								onPick(img);
							}}
						>
							<img
								src={toLocalResourceUrl(img.path)}
								alt={img.name}
								className="h-full w-full object-cover"
								loading="lazy"
							/>
						</button>
					))}
				</div>
			) : (
				<span className="block px-1 py-2 text-xs text-muted-foreground">No images yet</span>
			)}
		</Card>
	);
}
