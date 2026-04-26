import React, { useEffect, useRef, useState } from 'react';
import {
	Bold,
	Italic,
	Underline,
	Strikethrough,
	Heading as HeadingIcon,
	Heading1,
	Heading2,
	Heading3,
	Heading4,
	Heading5,
	Heading6,
	Type,
	List,
	ListOrdered,
	Sparkles,
	Wand2,
	SpellCheck,
	FileText,
	Languages,
	ArrowRight,
} from 'lucide-react';
import { PluginKey } from '@tiptap/pm/state';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { cn } from '@/lib/utils';
import { useEditor } from '../hooks';
import { BubbleMenuPlugin } from '../plugins/bubble-menu-plugin';

const pluginKey = new PluginKey('bubbleMenu');

const HEADING_LEVELS: { level: 1 | 2 | 3 | 4 | 5 | 6; Icon: typeof Heading1; label: string }[] = [
	{ level: 1, Icon: Heading1, label: 'Heading 1' },
	{ level: 2, Icon: Heading2, label: 'Heading 2' },
	{ level: 3, Icon: Heading3, label: 'Heading 3' },
	{ level: 4, Icon: Heading4, label: 'Heading 4' },
	{ level: 5, Icon: Heading5, label: 'Heading 5' },
	{ level: 6, Icon: Heading6, label: 'Heading 6' },
];

export const BubbleMenu = React.memo(function BubbleMenu(): React.JSX.Element {
	const { editor, onAssistantAction } = useEditor();
	const menuRef = useRef<HTMLDivElement>(null);
	const [headingOpen, setHeadingOpen] = useState(false);

	useEffect(() => {
		const el = menuRef.current;
		if (!el || editor.isDestroyed) return;

		const plugin = BubbleMenuPlugin({
			pluginKey,
			editor,
			element: el,
			updateDelay: 250,
		});

		editor.registerPlugin(plugin);
		return () => {
			editor.unregisterPlugin(pluginKey);
		};
	}, [editor]);

	const isHeadingActive = HEADING_LEVELS.some(({ level }) =>
		editor.isActive('heading', { level })
	);

	return (
		<Card
			ref={menuRef}
			size="sm"
			className={cn('flex-row items-center gap-0.5! p-2! z-50')}
			style={{ visibility: 'hidden', position: 'absolute' }}
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

			<Popover open={headingOpen} onOpenChange={setHeadingOpen}>
				<PopoverTrigger
					openOnHover
					delay={100}
					closeDelay={150}
					render={
						<Button
							variant={isHeadingActive ? 'default' : 'ghost'}
							size="icon"
							aria-label="Heading"
						>
							<HeadingIcon className="h-3.5 w-3.5" />
						</Button>
					}
				/>
				<PopoverContent side="top" align="center" className="w-auto p-1">
					<div className="flex flex-row items-center gap-0.5">
						{HEADING_LEVELS.map(({ level, Icon, label }) => (
							<Button
								key={level}
								variant={editor.isActive('heading', { level }) ? 'default' : 'ghost'}
								size="icon"
								aria-label={label}
								onClick={() => {
									editor.chain().focus().toggleHeading({ level }).run();
									setHeadingOpen(false);
								}}
							>
								<Icon className="h-3.5 w-3.5" />
							</Button>
						))}
					</div>
				</PopoverContent>
			</Popover>

			<Button
				variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
				size="icon"
				aria-label="Bullet list"
				onClick={() => editor.chain().focus().toggleBulletList().run()}
			>
				<List className="h-3.5 w-3.5" />
			</Button>
			<Button
				variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
				size="icon"
				aria-label="Ordered list"
				onClick={() => editor.chain().focus().toggleOrderedList().run()}
			>
				<ListOrdered className="h-3.5 w-3.5" />
			</Button>

			<Popover>
				<PopoverTrigger
					openOnHover
					delay={100}
					closeDelay={150}
					render={
						<Button variant="ghost" size="icon" aria-label="Assistant" className="ml-auto">
							<Sparkles className="h-3.5 w-3.5" />
						</Button>
					}
				/>
				<PopoverContent side="top" align="end" className="w-56 p-1">
					<div className="flex flex-col gap-0.5">
						<Button
							variant="ghost"
							size="sm"
							className="justify-start w-full"
							onClick={() => onAssistantAction?.('improve', editor)}
						>
							<Wand2 className="h-3.5 w-3.5" />
							Improve writing
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="justify-start w-full"
							onClick={() => onAssistantAction?.('fix-grammar', editor)}
						>
							<SpellCheck className="h-3.5 w-3.5" />
							Fix grammar
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="justify-start w-full"
							onClick={() => onAssistantAction?.('summarize', editor)}
						>
							<FileText className="h-3.5 w-3.5" />
							Summarize
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="justify-start w-full"
							onClick={() => onAssistantAction?.('translate', editor)}
						>
							<Languages className="h-3.5 w-3.5" />
							Translate
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="justify-start w-full"
							onClick={() => onAssistantAction?.('continue-writing', editor)}
						>
							<ArrowRight className="h-3.5 w-3.5" />
							Continue writing
						</Button>
					</div>
				</PopoverContent>
			</Popover>
		</Card>
	);
});
