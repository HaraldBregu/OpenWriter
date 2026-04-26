import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bold, Italic, Underline, Strikethrough, Type, List, ListOrdered } from 'lucide-react';
import { PluginKey } from '@tiptap/pm/state';
import {
	arrow,
	autoUpdate,
	flip,
	FloatingArrow,
	offset,
	shift,
	useFloating,
	useTransitionStyles,
	type VirtualElement,
} from '@floating-ui/react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { cn } from '@/lib/utils';
import { useEditor } from '../hooks';
import { BubbleMenuPlugin } from '../plugins/bubble-menu-plugin';
import { AssistantMenu } from './AssistantMenu';
import { HeadingMenu } from './HeadingMenu';

const pluginKey = new PluginKey('bubbleMenu');

export const BubbleMenu = React.memo(function BubbleMenu(): React.JSX.Element | null {
	const { editor, onAssistantAction } = useEditor();
	const referenceRectRef = useRef<(() => DOMRect) | null>(null);
	const arrowRef = useRef<SVGSVGElement>(null);
	const [open, setOpen] = useState(false);
	const [listOpen, setListOpen] = useState(false);

	const virtualReference = useMemo<VirtualElement>(
		() => ({
			getBoundingClientRect: () => referenceRectRef.current?.() ?? new DOMRect(),
		}),
		[]
	);

	const { refs, floatingStyles, context } = useFloating({
		open,
		onOpenChange: setOpen,
		placement: 'left',
		strategy: 'fixed',
		whileElementsMounted: autoUpdate,
		middleware: [
			offset(8),
			flip({ fallbackPlacements: ['right'] }),
			shift({ padding: 8 }),
			arrow({ element: arrowRef }),
		],
	});

	useEffect(() => {
		refs.setPositionReference(virtualReference);
	}, [refs, virtualReference]);

	const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
		duration: { open: 180, close: 120 },
		initial: ({ side }) => ({
			opacity: 0,
			transform: `scale(0.95) translateX(${side === 'left' ? 4 : -4}px)`,
		}),
		open: { opacity: 1, transform: 'scale(1) translateX(0)' },
		close: ({ side }) => ({
			opacity: 0,
			transform: `scale(0.95) translateX(${side === 'left' ? 4 : -4}px)`,
		}),
		common: ({ side }) => ({
			transformOrigin: side === 'left' ? 'right center' : 'left center',
		}),
	});

	const handlePluginUpdate = useCallback(
		({
			open: nextOpen,
			getReferenceRect,
		}: {
			open: boolean;
			getReferenceRect: (() => DOMRect) | null;
		}) => {
			if (getReferenceRect) {
				referenceRectRef.current = getReferenceRect;
			}
			setOpen(nextOpen);
		},
		[]
	);

	useEffect(() => {
		if (!open) {
			setListOpen(false);
		}
	}, [open]);

	useEffect(() => {
		if (editor.isDestroyed) return;
		const plugin = BubbleMenuPlugin({
			pluginKey,
			editor,
			updateDelay: 250,
			onUpdate: handlePluginUpdate,
		});
		editor.registerPlugin(plugin);
		return () => {
			editor.unregisterPlugin(pluginKey);
		};
	}, [editor, handlePluginUpdate]);

	if (!isMounted) return null;

	const isListActive = editor.isActive('bulletList') || editor.isActive('orderedList');

	return (
		<div
			ref={refs.setFloating}
			style={floatingStyles}
			onMouseDown={(e) => e.preventDefault()}
			className="z-50"
		>
			<div
				style={{ ...transitionStyles, transformOrigin: 'bottom' }}
				className="relative will-change-transform"
			>
			<Card
				size="sm"
				className={cn('flex flex-row items-center gap-0.5! p-2!')}
			>
				<Button
					variant={editor.isActive('bold') ? 'default' : 'ghost'}
					size="icon"
					aria-label="Bold"
					onClick={() => editor.chain().focus().toggleBold().run()}
				>
					<Bold className="h-3.5 w-3.5" />
				</Button>
				<Button
					variant={editor.isActive('italic') ? 'default' : 'ghost'}
					size="icon"
					aria-label="Italic"
					onClick={() => editor.chain().focus().toggleItalic().run()}
				>
					<Italic className="h-3.5 w-3.5" />
				</Button>
				<Button
					variant={editor.isActive('underline') ? 'default' : 'ghost'}
					size="icon"
					aria-label="Underline"
					onClick={() => editor.chain().focus().toggleUnderline().run()}
				>
					<Underline className="h-3.5 w-3.5" />
				</Button>
				<Button
					variant={editor.isActive('strike') ? 'default' : 'ghost'}
					size="icon"
					aria-label="Strikethrough"
					onClick={() => editor.chain().focus().toggleStrike().run()}
				>
					<Strikethrough className="h-3.5 w-3.5" />
				</Button>
				<Button
					variant={editor.isActive('paragraph') ? 'default' : 'ghost'}
					size="icon"
					aria-label="Text"
					onClick={() => editor.chain().focus().setParagraph().run()}
				>
					<Type className="h-3.5 w-3.5" />
				</Button>

				<HeadingMenu editor={editor} />

				<Popover open={listOpen} onOpenChange={setListOpen}>
					<PopoverTrigger
						openOnHover
						delay={100}
						closeDelay={150}
						render={
							<Button variant={isListActive ? 'default' : 'ghost'} size="icon" aria-label="List">
								<List className="h-3.5 w-3.5" />
							</Button>
						}
					/>
					<PopoverContent side="top" align="center" className="w-auto p-1">
						<div className="flex flex-row items-center gap-0.5">
							<Button
								variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
								size="icon"
								aria-label="Bullet list"
								onClick={() => {
									editor.chain().focus().toggleBulletList().run();
									setListOpen(false);
								}}
							>
								<List className="h-3.5 w-3.5" />
							</Button>
							<Button
								variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
								size="icon"
								aria-label="Ordered list"
								onClick={() => {
									editor.chain().focus().toggleOrderedList().run();
									setListOpen(false);
								}}
							>
								<ListOrdered className="h-3.5 w-3.5" />
							</Button>
						</div>
					</PopoverContent>
				</Popover>

				<AssistantMenu editor={editor} onAction={onAssistantAction} />
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
	);
});
