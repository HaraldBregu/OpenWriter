import React, { useEffect, useReducer, useRef, useState } from 'react';
import {
	Heading as HeadingIcon,
	Heading1,
	Heading2,
	Heading3,
	Heading4,
	Heading5,
	Heading6,
} from 'lucide-react';
import {
	arrow,
	autoUpdate,
	flip,
	FloatingArrow,
	FloatingPortal,
	offset,
	shift,
	useClick,
	useDismiss,
	useFloating,
	useInteractions,
	useTransitionStyles,
} from '@floating-ui/react';
import type { Editor } from '@tiptap/core';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

const HEADING_LEVELS: { level: HeadingLevel; Icon: typeof Heading1; label: string }[] = [
	{ level: 1, Icon: Heading1, label: 'Heading 1' },
	{ level: 2, Icon: Heading2, label: 'Heading 2' },
	{ level: 3, Icon: Heading3, label: 'Heading 3' },
	{ level: 4, Icon: Heading4, label: 'Heading 4' },
	{ level: 5, Icon: Heading5, label: 'Heading 5' },
	{ level: 6, Icon: Heading6, label: 'Heading 6' },
];

export const HeadingMenu = React.memo(function HeadingMenu({
	editor,
}: {
	editor: Editor;
}): React.JSX.Element {
	const [open, setOpen] = useState(false);
	const [, forceRender] = useReducer((x: number) => x + 1, 0);
	const arrowRef = useRef<SVGSVGElement>(null);

	useEffect(() => {
		const handler = (): void => forceRender();
		editor.on('transaction', handler);
		return () => {
			editor.off('transaction', handler);
		};
	}, [editor]);

	const { refs, floatingStyles, context } = useFloating({
		open,
		onOpenChange: setOpen,
		placement: 'top',
		strategy: 'fixed',
		whileElementsMounted: autoUpdate,
		middleware: [offset(8), flip(), shift({ padding: 8 }), arrow({ element: arrowRef })],
	});

	const click = useClick(context);
	const dismiss = useDismiss(context);
	const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

	const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
		duration: { open: 150, close: 100 },
		initial: { opacity: 0, transform: 'scale(0.95) translateY(4px)' },
		open: { opacity: 1, transform: 'scale(1) translateY(0)' },
		close: { opacity: 0, transform: 'scale(0.95) translateY(4px)' },
	});

	const isHeadingActive = HEADING_LEVELS.some(({ level }) =>
		editor.isActive('heading', { level })
	);

	return (
		<>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							ref={refs.setReference}
							variant={isHeadingActive ? 'default' : 'ghost'}
							size="icon"
							aria-label="Heading"
							{...getReferenceProps()}
						>
							<HeadingIcon className="h-3.5 w-3.5" />
						</Button>
					}
				/>
				<TooltipContent>
					<div className="flex flex-col items-start gap-0.5">
						<span>Heading</span>
					</div>
				</TooltipContent>
			</Tooltip>
			{isMounted && (
				<FloatingPortal>
					<div
						ref={refs.setFloating}
						role="toolbar"
						aria-label="Heading levels"
						style={floatingStyles}
						onMouseDown={(e) => e.preventDefault()}
						className="z-[60]"
						{...getFloatingProps()}
					>
						<div
							style={{ ...transitionStyles, transformOrigin: 'bottom' }}
							className="relative will-change-transform"
						>
							<Card
								size="sm"
								className="flex flex-row items-center gap-0.5! p-1! shadow-[0_0_20px_0_rgba(0,0,0,0.12)]! dark:shadow-[0_0_24px_0_rgba(0,0,0,0.55)]!"
							>
								{HEADING_LEVELS.map(({ level, Icon, label }) => (
									<Button
										key={level}
										variant={editor.isActive('heading', { level }) ? 'default' : 'ghost'}
										size="icon"
										aria-label={label}
										onClick={() => {
											editor.chain().focus().toggleHeading({ level }).run();
											setOpen(false);
										}}
									>
										<Icon className="h-3.5 w-3.5" />
									</Button>
								))}
							</Card>
							<FloatingArrow
								ref={arrowRef}
								context={context}
								className="fill-card [&>path:first-of-type]:stroke-foreground/10 [&>path:last-of-type]:stroke-card"
								strokeWidth={1}
								tipRadius={2}
							/>
						</div>
					</div>
				</FloatingPortal>
			)}
		</>
	);
});
