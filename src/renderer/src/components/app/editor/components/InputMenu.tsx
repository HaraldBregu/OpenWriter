import React, { useCallback, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
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
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/InputGroup';

export interface InputMenuProps {
	onSubmit: (prompt: string) => void;
	onOpenChange?: (open: boolean) => void;
	triggerLabel?: string;
	placeholder?: string;
}

export const InputMenu = React.memo(function InputMenu({
	onSubmit,
	onOpenChange,
	triggerLabel = 'Ask for a review',
	placeholder = 'Ask anything…',
}: InputMenuProps): React.JSX.Element {
	const [open, setOpen] = useState(false);
	const [value, setValue] = useState('');
	const arrowRef = useRef<SVGSVGElement>(null);

	const handleOpenChange = useCallback(
		(next: boolean) => {
			setOpen(next);
			onOpenChange?.(next);
			if (!next) setValue('');
		},
		[onOpenChange]
	);

	const { refs, floatingStyles, context } = useFloating({
		open,
		onOpenChange: handleOpenChange,
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

	const handleSubmit = useCallback(() => {
		const trimmed = value.trim();
		if (!trimmed) return;
		onSubmit(trimmed);
		handleOpenChange(false);
	}, [value, onSubmit, handleOpenChange]);

	return (
		<>
			<Button
				ref={refs.setReference}
				variant="ghost"
				size="sm"
				className="justify-start w-full"
				{...getReferenceProps()}
			>
				<Sparkles />
				{triggerLabel}
			</Button>
			{isMounted && (
				<FloatingPortal>
					<div
						ref={refs.setFloating}
						data-input-menu-popover="true"
						style={floatingStyles}
						className="z-[60]"
						onMouseDown={(e) => {
							if ((e.target as HTMLElement).closest('input, textarea')) return;
							e.preventDefault();
						}}
						{...getFloatingProps()}
					>
						<div
							style={{ ...transitionStyles, transformOrigin: 'bottom' }}
							className="relative will-change-transform"
						>
							<Card
								size="sm"
								className="p-2! w-64 shadow-[0_0_20px_0_rgba(0,0,0,0.12)]! dark:shadow-[0_0_24px_0_rgba(0,0,0,0.55)]!"
							>
								<InputGroup className="rounded-sm!">
									<InputGroupAddon>
										<Sparkles className="h-3.5 w-3.5" />
									</InputGroupAddon>
									<InputGroupInput
										autoFocus
										value={value}
										onChange={(e) => setValue(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter' && !e.shiftKey) {
												e.preventDefault();
												handleSubmit();
											}
										}}
										placeholder={placeholder}
									/>
								</InputGroup>
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
