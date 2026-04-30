import React, { useEffect } from 'react';
import {
	autoUpdate,
	flip,
	offset,
	shift,
	useFloating,
	useTransitionStyles,
} from '@floating-ui/react';
import { FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { ResourceInfo } from '../../../../../../shared/types';

export interface ContentsMenuProps {
	open: boolean;
	anchor: HTMLElement | null;
	contents: ResourceInfo[];
	selectedIndex: number;
	onSelectIndex: (index: number) => void;
	onPick: (content: ResourceInfo) => void;
	onMouseEnter?: () => void;
}

export function ContentsMenu({
	open,
	anchor,
	contents,
	selectedIndex,
	onSelectIndex,
	onPick,
	onMouseEnter,
}: ContentsMenuProps): React.JSX.Element | null {
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
					className="p-1! m-0! w-[240px] max-h-[260px] overflow-y-auto shadow-[0_0_20px_0_rgba(0,0,0,0.12)]! dark:shadow-[0_0_24px_0_rgba(0,0,0,0.55)]!"
				>
					{contents.length > 0 ? (
						<div className="flex flex-col">
							{contents.map((item, i) => (
								<Button
									key={item.id}
									variant={i === selectedIndex ? 'secondary' : 'ghost'}
									className="w-full justify-start"
									title={item.name}
									onMouseEnter={() => onSelectIndex(i)}
									onMouseDown={(e) => {
										e.preventDefault();
										onPick(item);
									}}
								>
									<FileText />
									<span className="truncate">{item.name}</span>
								</Button>
							))}
						</div>
					) : (
						<span className="block px-2 py-2 text-xs text-muted-foreground">No contents yet</span>
					)}
				</Card>
			</div>
		</div>
	);
}
