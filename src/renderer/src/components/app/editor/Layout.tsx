import { forwardRef, useRef, type ReactNode } from 'react';
import type { Editor } from '@tiptap/core';
import { cn } from '@/lib/utils';
import { Provider } from './Provider';
import type { AssistantAction } from './context/context';
import { GUTTER_WIDTH } from './shared/common';

interface LayoutProps {
	readonly id?: string;
	readonly className?: string;
	readonly editor: Editor | null;
	readonly onInsertContent?: () => void;
	readonly onAssistantAction?: (action: AssistantAction, editor: Editor) => void;
	readonly onImageInsert: (result: { src: string; alt: string; title: string }) => void;
	readonly children: ReactNode;
}

const Layout = forwardRef<HTMLDivElement, LayoutProps>(
	(
		{
			id,
			className,
			editor,
			onInsertContent,
			onAssistantAction,
			onImageInsert,
			children,
		},
		ref
	) => {
		const containerRef = useRef<HTMLDivElement>(null);
		const setRefs = (node: HTMLDivElement | null) => {
			containerRef.current = node;
			if (typeof ref === 'function') ref(node);
			else if (ref) ref.current = node;
		};
		return (
			<div id={id} className={cn('h-full min-w-0 flex flex-col', className)}>
				<div className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
					<div className="mx-auto flex w-full max-w-7xl flex-col gap-2 py-10">
						<div ref={setRefs} className="relative w-full">
							{editor ? (
								<Provider
									editor={editor}
									containerRef={containerRef}
									onInsertContent={onInsertContent}
									onAssistantAction={onAssistantAction}
									onImageInsert={onImageInsert}
								>
									{children}
								</Provider>
							) : (
								children
							)}
						</div>
					</div>
				</div>
			</div>
		);
	}
);
Layout.displayName = 'Layout';

export default Layout;
