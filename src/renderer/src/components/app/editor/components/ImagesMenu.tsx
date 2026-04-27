import React, { useEffect } from 'react';
import {
	autoUpdate,
	flip,
	offset,
	shift,
	useFloating,
	useTransitionStyles,
} from '@floating-ui/react';
import { Card } from '@/components/ui/Card';
import type { ImageEntry } from '../../../../../../shared/types';

function toLocalResourceUrl(filePath: string): string {
	const normalized = filePath.replace(/\\/g, '/');
	const urlPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
	return `local-resource://localhost${urlPath}`;
}

export interface ImagesMenuProps {
	open: boolean;
	anchor: HTMLElement | null;
	images: ImageEntry[];
	selectedIndex: number;
	onSelectIndex: (index: number) => void;
	onPick: (image: ImageEntry) => void;
	onMouseEnter?: () => void;
}

export function ImagesMenu({
	open,
	anchor,
	images,
	selectedIndex,
	onSelectIndex,
	onPick,
	onMouseEnter,
}: ImagesMenuProps): React.JSX.Element | null {
	const { refs, floatingStyles, context } = useFloating({
		open,
		placement: 'right-start',
		strategy: 'fixed',
		whileElementsMounted: autoUpdate,
		middleware: [
			offset(6),
			flip({ fallbackPlacements: ['left-start', 'right-end', 'left-end'] }),
			shift({ padding: 8 }),
		],
	});

	useEffect(() => {
		refs.setReference(anchor);
	}, [refs, anchor]);

	const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
		duration: { open: 150, close: 100 },
		initial: { opacity: 0, transform: 'scale(0.96)' },
		open: {
			opacity: 1,
			transform: 'scale(1)',
			transitionTimingFunction: 'cubic-bezier(0.16, 1.2, 0.4, 1)',
		},
		close: { opacity: 0, transform: 'scale(0.97)' },
		common: ({ side }) => ({
			transformOrigin:
				side === 'left' ? 'right top' : side === 'right' ? 'left top' : 'top',
		}),
	});

	if (!isMounted) return null;

	return (
		<div
			ref={refs.setFloating}
			style={floatingStyles}
			className="z-50"
			onMouseEnter={onMouseEnter}
			onMouseDown={(e) => e.preventDefault()}
		>
			<div style={transitionStyles} className="will-change-transform">
				<Card
					size="sm"
					className="p-2! m-0! w-[220px] max-h-[220px] overflow-y-auto shadow-[0_0_20px_0_rgba(0,0,0,0.12)]! dark:shadow-[0_0_24px_0_rgba(0,0,0,0.55)]!"
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
			</div>
		</div>
	);
}
