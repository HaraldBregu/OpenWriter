import { forwardRef, useRef, type ReactNode } from 'react';
import type { Editor } from '@tiptap/core';
import { cn } from '@/lib/utils';
import { Provider } from './Provider';
import { GUTTER_WIDTH } from './shared/common';

interface LayoutProps {
	readonly id?: string;
	readonly className?: string;
	readonly editor: Editor | null;
	readonly onInsertContent?: () => void;
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
			onImageInsert,
			children,
		},
		ref
	) => {
		const containerRef = useRef<HTMLDivElement>(null);
		return (
			<div id={id} className={cn('h-full min-w-0 flex flex-col', className)}>
				<div className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
					<div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-10 py-10">
						<div className="relative w-full" ref={ref}>
							<div
								ref={containerRef}
								className="relative"
								style={{ paddingLeft: GUTTER_WIDTH, paddingRight: GUTTER_WIDTH }}
							>
								{editor ? (
									<Provider
										editor={editor}
										containerRef={containerRef}
										onInsertContent={onInsertContent}
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
			</div>
		);
	}
);
Layout.displayName = 'Layout';

export default Layout;
