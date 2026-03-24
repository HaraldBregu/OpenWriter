import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Bold,
	Italic,
	Underline,
	Strikethrough,
	Heading1,
	Heading2,
	Heading3,
	List,
	ListOrdered,
	Undo2,
	Redo2,
} from 'lucide-react';
import type { Editor } from '@tiptap/core';
import { useEditorInstance } from './context/editor-instance-context';
import {
	AppButton,
	AppTooltip,
	AppTooltipTrigger,
	AppTooltipContent,
	AppTooltipProvider,
} from '@/components/app';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface EditorSidebarProps {
	readonly open: boolean;
	readonly animate?: boolean;
}

interface SidebarButtonProps {
	readonly label: string;
	readonly isActive?: boolean;
	readonly disabled?: boolean;
	readonly onClick: () => void;
	readonly children: React.ReactNode;
}

interface SectionProps {
	readonly label: string;
	readonly children: React.ReactNode;
}

// ------------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------------

const SidebarButton = React.memo(function SidebarButton({
	label,
	isActive = false,
	disabled = false,
	onClick,
	children,
}: SidebarButtonProps): React.JSX.Element {
	return (
		<AppTooltip>
			<AppTooltipTrigger asChild>
				<AppButton
					type="button"
					variant="ghost"
					size="icon"
					aria-label={label}
					aria-pressed={isActive}
					disabled={disabled}
					onClick={onClick}
					className={`h-8 w-8 ${
						isActive
							? 'bg-accent text-accent-foreground'
							: 'text-muted-foreground hover:text-foreground'
					}`}
				>
					{children}
				</AppButton>
			</AppTooltipTrigger>
			<AppTooltipContent side="bottom">
				<span className="text-xs">{label}</span>
			</AppTooltipContent>
		</AppTooltip>
	);
});

const SidebarSection = React.memo(function SidebarSection({
	label,
	children,
}: SectionProps): React.JSX.Element {
	return (
		<div className="space-y-1.5">
			<span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 px-1">
				{label}
			</span>
			<div className="flex flex-row flex-wrap gap-0.5">{children}</div>
		</div>
	);
});

// ------------------------------------------------------------------
// Controls panel — rendered only when the editor instance is ready
// ------------------------------------------------------------------

interface EditorControlsProps {
	readonly editor: Editor;
}

const EditorControls = React.memo(function EditorControls({
	editor,
}: EditorControlsProps): React.JSX.Element {
	const { t } = useTranslation();

	// Re-render when editor state changes so active / disabled states stay in sync.
	const [, forceUpdate] = useState(0);
	useEffect(() => {
		if (editor.isDestroyed) return;
		const handler = (): void => forceUpdate((n) => n + 1);
		editor.on('selectionUpdate', handler);
		editor.on('transaction', handler);
		return () => {
			editor.off('selectionUpdate', handler);
			editor.off('transaction', handler);
		};
	}, [editor]);

	const handleBold = useCallback(() => editor.chain().focus().toggleBold().run(), [editor]);
	const handleItalic = useCallback(() => editor.chain().focus().toggleItalic().run(), [editor]);
	const handleUnderline = useCallback(
		() => editor.chain().focus().toggleUnderline().run(),
		[editor]
	);
	const handleStrike = useCallback(() => editor.chain().focus().toggleStrike().run(), [editor]);
	const handleH1 = useCallback(
		() => editor.chain().focus().toggleHeading({ level: 1 }).run(),
		[editor]
	);
	const handleH2 = useCallback(
		() => editor.chain().focus().toggleHeading({ level: 2 }).run(),
		[editor]
	);
	const handleH3 = useCallback(
		() => editor.chain().focus().toggleHeading({ level: 3 }).run(),
		[editor]
	);
	const handleBulletList = useCallback(
		() => editor.chain().focus().toggleBulletList().run(),
		[editor]
	);
	const handleOrderedList = useCallback(
		() => editor.chain().focus().toggleOrderedList().run(),
		[editor]
	);
	const handleUndo = useCallback(() => editor.chain().focus().undo().run(), [editor]);
	const handleRedo = useCallback(() => editor.chain().focus().redo().run(), [editor]);

	const canUndo = editor.can().undo();
	const canRedo = editor.can().redo();

	return (
		<div className="flex flex-col gap-4 p-3">
			{/* Text formatting */}
			<SidebarSection label={t('editorSidebar.textFormatting')}>
				<SidebarButton
					label={t('editorSidebar.bold')}
					isActive={editor.isActive('bold')}
					onClick={handleBold}
				>
					<Bold className="h-3.5 w-3.5" aria-hidden="true" />
				</SidebarButton>
				<SidebarButton
					label={t('editorSidebar.italic')}
					isActive={editor.isActive('italic')}
					onClick={handleItalic}
				>
					<Italic className="h-3.5 w-3.5" aria-hidden="true" />
				</SidebarButton>
				<SidebarButton
					label={t('editorSidebar.underline')}
					isActive={editor.isActive('underline')}
					onClick={handleUnderline}
				>
					<Underline className="h-3.5 w-3.5" aria-hidden="true" />
				</SidebarButton>
				<SidebarButton
					label={t('editorSidebar.strikethrough')}
					isActive={editor.isActive('strike')}
					onClick={handleStrike}
				>
					<Strikethrough className="h-3.5 w-3.5" aria-hidden="true" />
				</SidebarButton>
			</SidebarSection>

			<div className="h-px bg-border" role="separator" />

			{/* Headings */}
			<SidebarSection label={t('editorSidebar.headings')}>
				<SidebarButton
					label={t('editorSidebar.heading1')}
					isActive={editor.isActive('heading', { level: 1 })}
					onClick={handleH1}
				>
					<Heading1 className="h-3.5 w-3.5" aria-hidden="true" />
				</SidebarButton>
				<SidebarButton
					label={t('editorSidebar.heading2')}
					isActive={editor.isActive('heading', { level: 2 })}
					onClick={handleH2}
				>
					<Heading2 className="h-3.5 w-3.5" aria-hidden="true" />
				</SidebarButton>
				<SidebarButton
					label={t('editorSidebar.heading3')}
					isActive={editor.isActive('heading', { level: 3 })}
					onClick={handleH3}
				>
					<Heading3 className="h-3.5 w-3.5" aria-hidden="true" />
				</SidebarButton>
			</SidebarSection>

			<div className="h-px bg-border" role="separator" />

			{/* Lists */}
			<SidebarSection label={t('editorSidebar.lists')}>
				<SidebarButton
					label={t('editorSidebar.bulletList')}
					isActive={editor.isActive('bulletList')}
					onClick={handleBulletList}
				>
					<List className="h-3.5 w-3.5" aria-hidden="true" />
				</SidebarButton>
				<SidebarButton
					label={t('editorSidebar.orderedList')}
					isActive={editor.isActive('orderedList')}
					onClick={handleOrderedList}
				>
					<ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />
				</SidebarButton>
			</SidebarSection>

			<div className="h-px bg-border" role="separator" />

			{/* History */}
			<SidebarSection label={t('editorSidebar.history')}>
				<SidebarButton label={t('editorSidebar.undo')} disabled={!canUndo} onClick={handleUndo}>
					<Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
				</SidebarButton>
				<SidebarButton label={t('editorSidebar.redo')} disabled={!canRedo} onClick={handleRedo}>
					<Redo2 className="h-3.5 w-3.5" aria-hidden="true" />
				</SidebarButton>
			</SidebarSection>
		</div>
	);
});

// ------------------------------------------------------------------
// Public component
// ------------------------------------------------------------------

const EditorSidebar: React.FC<EditorSidebarProps> = ({ open, animate = true }) => {
	const { t } = useTranslation();
	const { editor } = useEditorInstance();

	return (
		<div
			role="complementary"
			aria-label={t('editorSidebar.ariaLabel')}
			className={`shrink-0 flex flex-col border-l border-border bg-muted/30 overflow-y-auto overflow-x-hidden ${animate ? 'transition-all duration-300 ease-in-out' : ''} ${open ? 'w-72' : 'w-0'}`}
		>
			<AppTooltipProvider delayDuration={400}>
				{editor !== null && <EditorControls editor={editor} />}
			</AppTooltipProvider>
		</div>
	);
};

export default EditorSidebar;
