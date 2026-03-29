import React, { useCallback, useEffect, useRef } from 'react';
import {
	Bold,
	Italic,
	Underline,
	Strikethrough,
	Heading1,
	Heading2,
	Heading3,
	Sparkles,
} from 'lucide-react';
import { BubbleMenuPlugin } from './bubble-menu-plugin';
import { PluginKey } from '@tiptap/pm/state';
import { AppButton } from '../../app/AppButton';
import { useEditorContext } from '../EditorContext';
import { cn } from '@/lib/utils';

interface BubbleMenuProps {
	onEnhanceWithAssistant?: (selectedText: string, from: number, to: number) => void;
}

const pluginKey = new PluginKey('bubbleMenu');

function getMenuButtonClass({
	isActive = false,
	isAccent = false,
}: {
	isActive?: boolean;
	isAccent?: boolean;
}): string {
	if (isAccent) {
		return cn(
			'h-7 w-7 shadow-[inset_0_0_0_1px_hsl(var(--info)/0.18)]',
			'bg-[hsl(var(--info)/0.12)] text-[hsl(var(--info))]',
			'hover:bg-[hsl(var(--info)/0.18)] hover:text-[hsl(var(--info))]'
		);
	}

	return cn(
		'h-7 w-7',
		isActive
			? 'bg-accent text-foreground shadow-sm ring-1 ring-border/70'
			: 'text-foreground/70 hover:bg-accent/90 hover:text-foreground'
	);
}

export const BubbleMenu = React.memo(function BubbleMenu({
	onEnhanceWithAssistant,
}: BubbleMenuProps): React.JSX.Element {
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

	const handleEnhanceWithAI = useCallback(() => {
		const { from, to } = editor.state.selection;
		const selectedText = editor.state.doc.textBetween(from, to, ' ');
		if (selectedText.trim().length > 0) {
			onEnhanceWithAssistant?.(selectedText, from, to);
		}
	}, [editor, onEnhanceWithAssistant]);

	return (
		<div
			ref={menuRef}
			className="z-50 flex items-center gap-0.5 rounded-xl border border-border/80 bg-popover/95 p-1 shadow-[0_18px_40px_hsl(var(--foreground)/0.14)] backdrop-blur-md"
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

			<div className="mx-0.5 h-4 w-px bg-border" />

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

			{onEnhanceWithAssistant && (
				<>
					<div className="mx-0.5 h-4 w-px bg-border" />
					<AppButton
						variant="ghost"
						size="icon"
						aria-label="Enhance with AI"
						className={getMenuButtonClass({ isAccent: true })}
						onClick={handleEnhanceWithAI}
					>
						<Sparkles className="h-3.5 w-3.5" />
					</AppButton>
				</>
			)}
		</div>
	);
});
