import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
	Bold,
	Italic,
	List,
	ListOrdered,
	MessageCircle,
	MessageSquare,
	SpellCheck,
	Strikethrough,
	Type,
	Underline,
	Wand2,
} from 'lucide-react';
import { PluginKey } from '@tiptap/pm/state';
import {
	arrow,
	autoUpdate,
	flip,
	FloatingArrow,
	hide,
	offset,
	shift,
	useFloating,
	useTransitionStyles,
	type VirtualElement,
} from '@floating-ui/react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Separator } from '@/components/ui/Separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';
import { useEditor } from '../hooks';
import { BubbleMenuPlugin } from '../plugins/bubble-menu-plugin';
import { HeadingMenu } from './HeadingMenu';

const pluginKey = new PluginKey('bubbleMenu');
const IMPROVE_WRITING_DURATION = 5000;

const isMac =
	typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform);
const modKey = isMac ? '⌘' : 'Ctrl';
const shiftKey = isMac ? '⇧' : 'Shift';
const altKey = isMac ? '⌥' : 'Alt';

function TooltipBody({ title, keys }: { title: string; keys?: string[] }): React.JSX.Element {
	return (
		<div className="flex flex-col items-start gap-0.5">
			<span>{title}</span>
			{keys && keys.length > 0 && (
				<span className="flex items-center gap-0.5 text-[10px] opacity-70">
					{keys.map((k, i) => (
						<kbd
							key={`${k}-${i}`}
							data-slot="kbd"
							className="px-1 py-0 font-sans bg-background/15"
						>
							{k}
						</kbd>
					))}
				</span>
			)}
		</div>
	);
}

export type AiActionType = 'improve-writing' | 'fix-grammar' | 'custom';

export interface AiActionPayload {
	type: AiActionType;
	text: string;
	prompt?: string;
}

export interface BubbleMenuProps {
	onAiAction?: (action: AiActionPayload) => void;
}

export const BubbleMenu = React.memo(function BubbleMenu({
	onAiAction,
}: BubbleMenuProps): React.JSX.Element | null {
	const { editor } = useEditor();
	const referenceRectRef = useRef<(() => DOMRect) | null>(null);
	const arrowRef = useRef<SVGSVGElement>(null);
	const [open, setOpen] = useState(false);
	const [customPrompt, setCustomPrompt] = useState('');
	const [, forceRender] = useReducer((x: number) => x + 1, 0);

	const virtualReference = useMemo<VirtualElement>(
		() => ({
			getBoundingClientRect: () => referenceRectRef.current?.() ?? new DOMRect(),
		}),
		[]
	);

	const { refs, floatingStyles, context, middlewareData, update } = useFloating({
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
			hide({ strategy: 'referenceHidden' }),
		],
	});

	useEffect(() => {
		const handler = (): void => {
			forceRender();
			const { from, to } = editor.state.selection;
			if (from !== to) {
				update();
			}
		};
		editor.on('transaction', handler);
		return () => {
			editor.off('transaction', handler);
		};
	}, [editor, update]);

	const referenceHiddenOffsets = middlewareData.hide?.referenceHiddenOffsets;
	const referenceHidden =
		(middlewareData.hide?.referenceHidden ?? false) ||
		(referenceHiddenOffsets
			? referenceHiddenOffsets.top > 0 ||
			referenceHiddenOffsets.bottom > 0 ||
			referenceHiddenOffsets.left > 0 ||
			referenceHiddenOffsets.right > 0
			: false);

	useEffect(() => {
		refs.setPositionReference(virtualReference);
	}, [refs, virtualReference]);

	const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
		duration: { open: 220, close: 120 },
		initial: { opacity: 0, transform: 'scale(0.8)' },
		open: {
			opacity: 1,
			transform: 'scale(1)',
			transitionTimingFunction: 'cubic-bezier(0.16, 1.2, 0.4, 1)',
		},
		close: { opacity: 0, transform: 'scale(0.95)' },
		common: ({ side }) => ({
			transformOrigin: side === 'left' ? 'right center' : 'left center',
		}),
	});

	const improveWritingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleImproveWriting = useCallback(() => {
		const { from, to } = editor.state.selection;
		if (from === to) return;
		if (improveWritingTimerRef.current) {
			clearTimeout(improveWritingTimerRef.current);
			improveWritingTimerRef.current = null;
		}
		editor.view.dom.classList.add('improving-writing');
		editor.setEditable(false);
		improveWritingTimerRef.current = setTimeout(() => {
			improveWritingTimerRef.current = null;
			if (editor.isDestroyed) return;
			editor.view.dom.classList.remove('improving-writing');
			editor.setEditable(true);
		}, IMPROVE_WRITING_DURATION);
	}, [editor]);

	const handleAiAction = useCallback(
		(type: AiActionType, prompt?: string) => {
			const { from, to } = editor.state.selection;
			if (from === to) return;
			const slicedDoc = editor.state.doc.cut(from, to);
			const text =
				editor.markdown?.serialize(slicedDoc.toJSON()) ??
				editor.state.doc.textBetween(from, to, '\n\n');
			onAiAction?.({ type, text, prompt });
		},
		[editor, onAiAction]
	);

	const handleCustomPromptSubmit = useCallback(() => {
		const trimmed = customPrompt.trim();
		if (!trimmed) return;
		handleAiAction('custom', trimmed);
		setCustomPrompt('');
	}, [customPrompt, handleAiAction]);

	useEffect(() => {
		return () => {
			if (improveWritingTimerRef.current) {
				clearTimeout(improveWritingTimerRef.current);
				improveWritingTimerRef.current = null;
				if (!editor.isDestroyed) {
					editor.view.dom.classList.remove('improving-writing');
					editor.setEditable(true);
				}
			}
		};
	}, [editor]);

	const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
			if (closeTimerRef.current) {
				clearTimeout(closeTimerRef.current);
				closeTimerRef.current = null;
			}
			if (nextOpen) {
				setOpen(true);
				return;
			}
			if (editor.view.dom.classList.contains('improving-writing')) return;
			closeTimerRef.current = setTimeout(() => {
				closeTimerRef.current = null;
				if (refs.floating.current?.contains(document.activeElement)) return;
				setOpen(false);
			}, 0);
		},
		[editor, refs]
	);

	useEffect(() => {
		return () => {
			if (closeTimerRef.current) {
				clearTimeout(closeTimerRef.current);
				closeTimerRef.current = null;
			}
		};
	}, []);

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

	return (
		<div
			ref={refs.setFloating}
			role="toolbar"
			aria-label="Selection toolbar"
			style={{
				...floatingStyles,
				opacity: referenceHidden ? 0 : 1,
				pointerEvents: referenceHidden ? 'none' : undefined,
				transition: 'opacity 120ms ease-out',
			}}
			onMouseDown={(e) => {
				if ((e.target as HTMLElement).closest('input, textarea')) return;
				e.preventDefault();
			}}
			className="z-50"
		>
			<div style={transitionStyles} className="relative will-change-transform">
				<Card
					size="sm"
					className={cn(
						'flex flex-col gap-1! py-2! px-2.5! w-fit',
						'shadow-[0_0_20px_0_rgba(0,0,0,0.12)]! dark:shadow-[0_0_24px_0_rgba(0,0,0,0.55)]!'
					)}
				>
					<div className="flex flex-row items-center gap-0.5">
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										variant={editor.isActive('bold') ? 'default' : 'ghost'}
										size="icon"
										aria-label="Bold"
										onClick={() => editor.chain().focus().toggleBold().run()}
									>
										<Bold className="h-3.5 w-3.5" />
									</Button>
								}
							/>
							<TooltipContent>
								<TooltipBody title="Bold" keys={[modKey, 'B']} />
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										variant={editor.isActive('italic') ? 'default' : 'ghost'}
										size="icon"
										aria-label="Italic"
										onClick={() => editor.chain().focus().toggleItalic().run()}
									>
										<Italic className="h-3.5 w-3.5" />
									</Button>
								}
							/>
							<TooltipContent>
								<TooltipBody title="Italic" keys={[modKey, 'I']} />
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										variant={editor.isActive('underline') ? 'default' : 'ghost'}
										size="icon"
										aria-label="Underline"
										onClick={() => editor.chain().focus().toggleUnderline().run()}
									>
										<Underline className="h-3.5 w-3.5" />
									</Button>
								}
							/>
							<TooltipContent>
								<TooltipBody title="Underline" keys={[modKey, 'U']} />
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										variant={editor.isActive('strike') ? 'default' : 'ghost'}
										size="icon"
										aria-label="Strikethrough"
										onClick={() => editor.chain().focus().toggleStrike().run()}
									>
										<Strikethrough className="h-3.5 w-3.5" />
									</Button>
								}
							/>
							<TooltipContent>
								<TooltipBody title="Strikethrough" keys={[modKey, shiftKey, 'S']} />
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										variant={editor.isActive('paragraph') ? 'default' : 'ghost'}
										size="icon"
										aria-label="Text"
										onClick={() => editor.chain().focus().setParagraph().run()}
									>
										<Type className="h-3.5 w-3.5" />
									</Button>
								}
							/>
							<TooltipContent>
								<TooltipBody title="Text" keys={[modKey, altKey, '0']} />
							</TooltipContent>
						</Tooltip>
						<HeadingMenu editor={editor} />
					</div>

					<div className="flex flex-row items-center gap-0.5">
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
										size="icon"
										aria-label="Bullet list"
										onClick={() => editor.chain().focus().toggleBulletList().run()}
									>
										<List className="h-3.5 w-3.5" />
									</Button>
								}
							/>
							<TooltipContent>
								<TooltipBody title="Bullet list" keys={[modKey, shiftKey, '8']} />
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
										size="icon"
										aria-label="Ordered list"
										onClick={() => editor.chain().focus().toggleOrderedList().run()}
									>
										<ListOrdered className="h-3.5 w-3.5" />
									</Button>
								}
							/>
							<TooltipContent>
								<TooltipBody title="Ordered list" keys={[modKey, shiftKey, '7']} />
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger
								render={
									<Button variant="ghost" size="icon" aria-label="Comment" disabled>
										<MessageSquare className="h-3.5 w-3.5" />
									</Button>
								}
							/>
							<TooltipContent>Comment</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger
								render={
									<Button variant="ghost" size="icon" aria-label="Chat" disabled>
										<MessageCircle className="h-3.5 w-3.5" />
									</Button>
								}
							/>
							<TooltipContent>Chat</TooltipContent>
						</Tooltip>
					</div>

					<Separator className="my-1" />

					<div className="flex flex-col gap-0.5">
						<Button
							variant="ghost"
							size="sm"
							className="justify-start w-full"
							onClick={() => {
								handleImproveWriting();
								handleAiAction('improve-writing');
							}}
						>
							<Wand2 />
							Improve writing
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="justify-start w-full"
							onClick={() => handleAiAction('fix-grammar')}
						>
							<SpellCheck />
							Fix grammar
						</Button>
					</div>

					<Separator className="my-1" />

					<Input
						value={customPrompt}
						onChange={(e) => setCustomPrompt(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								handleCustomPromptSubmit();
							}
						}}
						placeholder="Ask AI…"
					/>
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
