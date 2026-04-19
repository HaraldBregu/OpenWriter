import React, { useEffect, useRef } from 'react';
import {
	Bold,
	Italic,
	Underline,
	Strikethrough,
	Heading1,
	Heading2,
	Heading3,
	Type,
	List,
	ListOrdered,
} from 'lucide-react';
import { PluginKey } from '@tiptap/pm/state';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Separator } from '@/components/ui/Separator';
import { cn } from '@/lib/utils';
import { useEditor } from '../hooks';
import { BubbleMenuPlugin } from '../plugins/bubble-menu-plugin';

const pluginKey = new PluginKey('bubbleMenu');

export const BubbleMenu = React.memo(function BubbleMenu(): React.JSX.Element {
	const { editor } = useEditor();
	const menuRef = useRef<HTMLDivElement>(null);

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

	return (
		<Card
			ref={menuRef}
			size="sm"
			className={cn('flex-col gap-1! p-2! z-50')}
			style={{ visibility: 'hidden', position: 'absolute' }}
		>
			<div className="flex flex-row gap-0.5">
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
			</div>

			<Separator orientation="horizontal" className="h-px my-0.5" />

			<div className="flex flex-row gap-0.5">
				<Button
					variant={editor.isActive('paragraph') ? 'default' : 'ghost'}
					size="icon"
					aria-label="Text"
					onClick={() => editor.chain().focus().setParagraph().run()}
				>
					<Type className="h-3.5 w-3.5" />
				</Button>
				<Button
					variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
					size="icon"
					aria-label="Heading 1"
					onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
				>
					<Heading1 className="h-3.5 w-3.5" />
				</Button>
				<Button
					variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
					size="icon"
					aria-label="Heading 2"
					onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
				>
					<Heading2 className="h-3.5 w-3.5" />
				</Button>
				<Button
					variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
					size="icon"
					aria-label="Heading 3"
					onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
				>
					<Heading3 className="h-3.5 w-3.5" />
				</Button>
				<Separator orientation="vertical" className="w-px mx-0.5" />
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
			</div>
		</Card>
	);
});
