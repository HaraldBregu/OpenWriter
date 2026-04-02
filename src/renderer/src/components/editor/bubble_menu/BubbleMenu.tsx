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
} from 'lucide-react';
import { BubbleMenuPlugin } from './bubble-menu-plugin';
import { PluginKey } from '@tiptap/pm/state';
import { AppButton } from '../../app/AppButton';
import { useEditorContext } from '../EditorContext';
import { cn } from '@/lib/utils';

const pluginKey = new PluginKey('bubbleMenu');

const menuContainerClass =
	'z-50 flex items-center gap-0.5 rounded-xl border border-border/80 bg-popover/95 p-1 text-popover-foreground shadow-[0_18px_40px_hsl(var(--foreground)/0.14)] ring-1 ring-black/5 backdrop-blur-md dark:border-border dark:bg-popover dark:ring-[hsl(var(--border)/0.7)] dark:shadow-[0_18px_44px_hsl(0_0%_0%/0.46)]';

const separatorClass = 'mx-0.5 h-4 w-px bg-border/80 dark:bg-border';

function getMenuButtonClass({
	isActive = false,
	isAccent = false,
}: {
	isActive?: boolean;
	isAccent?: boolean;
}): string {
	if (isAccent) {
		return cn(
			'h-7 w-7 shadow-[inset_0_0_0_1px_hsl(var(--info)/0.22)]',
			'bg-[hsl(var(--info)/0.14)] text-[hsl(var(--info))] hover:bg-[hsl(var(--info)/0.2)] hover:text-[hsl(var(--info))]',
			'dark:bg-[hsl(var(--info))] dark:text-[hsl(var(--info-foreground))] dark:shadow-[inset_0_0_0_1px_hsl(var(--info)/0.4)] dark:hover:bg-[hsl(var(--info)/0.9)] dark:hover:text-[hsl(var(--info-foreground))]'
		);
	}

	return cn(
		'h-7 w-7',
		isActive
			? 'bg-accent text-foreground shadow-sm ring-1 ring-border/70 dark:bg-accent/95 dark:text-foreground dark:ring-[hsl(var(--border)/0.7)]'
			: 'text-foreground/80 hover:bg-accent/95 hover:text-foreground dark:text-foreground/82 dark:hover:bg-accent dark:hover:text-foreground'
	);
}

export const BubbleMenu = React.memo(function BubbleMenu(): React.JSX.Element {
	const { editor } = useEditorContext();
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
		<div
			ref={menuRef}
			className={menuContainerClass}
			style={{ visibility: 'hidden', position: 'absolute' }}
		>
			<AppButton
				variant="ghost"
				size="icon"
				aria-label="Bold"
				className={getMenuButtonClass({ isActive: editor.isActive('bold') })}
				onClick={() => editor.chain().focus().toggleBold().run()}
			>
				<Bold className="h-3.5 w-3.5" />
			</AppButton>
			<AppButton
				variant="ghost"
				size="icon"
				aria-label="Italic"
				className={getMenuButtonClass({ isActive: editor.isActive('italic') })}
				onClick={() => editor.chain().focus().toggleItalic().run()}
			>
				<Italic className="h-3.5 w-3.5" />
			</AppButton>
			<AppButton
				variant="ghost"
				size="icon"
				aria-label="Underline"
				className={getMenuButtonClass({ isActive: editor.isActive('underline') })}
				onClick={() => editor.chain().focus().toggleUnderline().run()}
			>
				<Underline className="h-3.5 w-3.5" />
			</AppButton>
			<AppButton
				variant="ghost"
				size="icon"
				aria-label="Strikethrough"
				className={getMenuButtonClass({ isActive: editor.isActive('strike') })}
				onClick={() => editor.chain().focus().toggleStrike().run()}
			>
				<Strikethrough className="h-3.5 w-3.5" />
			</AppButton>

			<div className={separatorClass} />

			<AppButton
				variant="ghost"
				size="icon"
				aria-label="Text"
				className={getMenuButtonClass({ isActive: editor.isActive('paragraph') })}
				onClick={() => editor.chain().focus().setParagraph().run()}
			>
				<Type className="h-3.5 w-3.5" />
			</AppButton>
			<AppButton
				variant="ghost"
				size="icon"
				aria-label="Heading 1"
				className={getMenuButtonClass({ isActive: editor.isActive('heading', { level: 1 }) })}
				onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
			>
				<Heading1 className="h-3.5 w-3.5" />
			</AppButton>
			<AppButton
				variant="ghost"
				size="icon"
				aria-label="Heading 2"
				className={getMenuButtonClass({ isActive: editor.isActive('heading', { level: 2 }) })}
				onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
			>
				<Heading2 className="h-3.5 w-3.5" />
			</AppButton>
			<AppButton
				variant="ghost"
				size="icon"
				aria-label="Heading 3"
				className={getMenuButtonClass({ isActive: editor.isActive('heading', { level: 3 }) })}
				onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
			>
				<Heading3 className="h-3.5 w-3.5" />
			</AppButton>
		</div>
	);
});
