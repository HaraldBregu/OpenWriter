import { forwardRef, useRef } from 'react';
import { EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import { cn } from '@/lib/utils';
import { BlockControls, GUTTER_WIDTH } from './components/BlockControls';
import { BlockActions } from './components/BlockActions';
import { BubbleMenu } from './components/BubbleMenu';
import { OptionMenu } from './components/OptionMenu';
import { Provider } from './Provider';

interface LayoutProps {
	readonly id?: string;
	readonly className?: string;
	readonly editor: Editor | null;
	readonly onContinueWithAssistant?: (
		before: string,
		after: string,
		cursorPos: number,
		closeMenu: () => void
	) => void;
	readonly onInsertContent?: () => void;
	readonly onImageInsert: (result: { src: string; alt: string; title: string }) => void;
}

const Layout = forwardRef<HTMLDivElement, LayoutProps>(
	(
		{ id, className, editor, onContinueWithAssistant, onInsertContent, onImageInsert },
		ref
	) => {
		const containerRef = useRef<HTMLDivElement>(null);
		return (
			<div id={id} className={cn('w-full', className)}>
				<div className="relative w-full" ref={ref}>
					<div
						ref={containerRef}
						className="relative"
						style={{ paddingLeft: GUTTER_WIDTH, paddingRight: GUTTER_WIDTH }}
					>
						{editor && (
							<Provider
								editor={editor}
								containerRef={containerRef}
								onContinueWithAssistant={onContinueWithAssistant}
								onInsertContent={onInsertContent}
								onImageInsert={onImageInsert}
							>
								<BlockControls />
								<BlockActions />
								<BubbleMenu />
								<OptionMenu />
							</Provider>
						)}
						<EditorContent editor={editor} />
					</div>
				</div>
			</div>
		);
	}
);
Layout.displayName = 'Layout';

export default Layout;
