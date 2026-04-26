import React, { useRef, useState } from 'react';
import {
	ArrowRight,
	FileText,
	Languages,
	Sparkles,
	SpellCheck,
	Wand2,
} from 'lucide-react';
import {
	arrow,
	autoUpdate,
	flip,
	FloatingArrow,
	FloatingPortal,
	offset,
	safePolygon,
	shift,
	useClick,
	useDismiss,
	useFloating,
	useHover,
	useInteractions,
	useTransitionStyles,
} from '@floating-ui/react';
import type { Editor } from '@tiptap/core';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { AssistantAction } from '../context/context';

const ACTIONS: { action: AssistantAction; Icon: typeof Sparkles; label: string }[] = [
	{ action: 'improve', Icon: Wand2, label: 'Improve writing' },
	{ action: 'fix-grammar', Icon: SpellCheck, label: 'Fix grammar' },
	{ action: 'summarize', Icon: FileText, label: 'Summarize' },
	{ action: 'translate', Icon: Languages, label: 'Translate' },
	{ action: 'continue-writing', Icon: ArrowRight, label: 'Continue writing' },
];

export const AssistantMenu = React.memo(function AssistantMenu({
	editor,
	onAction,
}: {
	editor: Editor;
	onAction?: (action: AssistantAction, editor: Editor) => void;
}): React.JSX.Element {
	const [open, setOpen] = useState(false);
	const arrowRef = useRef<SVGSVGElement>(null);

	const { refs, floatingStyles, context } = useFloating({
		open,
		onOpenChange: setOpen,
		placement: 'top-end',
		strategy: 'fixed',
		whileElementsMounted: autoUpdate,
		middleware: [offset(8), flip(), shift({ padding: 8 }), arrow({ element: arrowRef })],
	});

	const hover = useHover(context, {
		delay: { open: 100, close: 150 },
		handleClose: safePolygon(),
	});
	const click = useClick(context);
	const dismiss = useDismiss(context);
	const { getReferenceProps, getFloatingProps } = useInteractions([hover, click, dismiss]);

	const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
		duration: { open: 150, close: 100 },
		initial: { opacity: 0, transform: 'scale(0.95) translateY(4px)' },
		open: { opacity: 1, transform: 'scale(1) translateY(0)' },
		close: { opacity: 0, transform: 'scale(0.95) translateY(4px)' },
	});

	return (
		<>
			<Button
				ref={refs.setReference}
				variant="ghost"
				size="icon"
				aria-label="Assistant"
				className="ml-auto"
				{...getReferenceProps()}
			>
				<Sparkles className="h-3.5 w-3.5" />
			</Button>
			{isMounted && (
				<FloatingPortal>
					<div
						ref={refs.setFloating}
						style={floatingStyles}
						onMouseDown={(e) => e.preventDefault()}
						className="z-[60]"
						{...getFloatingProps()}
					>
						<div
							style={{ ...transitionStyles, transformOrigin: 'bottom' }}
							className="relative will-change-transform"
						>
							<Card size="sm" className="flex flex-col gap-0.5! p-1! w-56">
								{ACTIONS.map(({ action, Icon, label }) => (
									<Button
										key={action}
										variant="ghost"
										size="sm"
										className="justify-start w-full"
										onClick={() => {
											onAction?.(action, editor);
											setOpen(false);
										}}
									>
										<Icon className="h-3.5 w-3.5" />
										{label}
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
