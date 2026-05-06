import { forwardRef, useRef, type ReactNode } from 'react';
import type { Editor } from '@tiptap/core';
import { cn } from '@/lib/utils';
import { Provider } from './Provider';

interface LayoutProps {
	readonly id?: string;
	readonly className?: string;
	readonly editor: Editor | null;
	readonly onImageInsert?: (result: { src: string; alt: string; title: string }) => void;
	readonly children: ReactNode;
	/** Editor content max-width as a whole-number percentage (1–100). */
	readonly width?: number;
}

const Layout = forwardRef<HTMLDivElement, LayoutProps>(
	({ id, className, editor, onImageInsert, children, width = 70 }, ref) => {
		const containerRef = useRef<HTMLDivElement>(null);
		return (
			<div id={id} className={cn('h-full min-w-0 flex flex-col', className)}>
				<div className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
					<div
						className="mx-auto flex w-full flex-col gap-2 p-6"
						style={{ maxWidth: `${width}%` }}
					>
						<div
							ref={(node) => {
								containerRef.current = node;
								if (typeof ref === 'function') ref(node);
								else if (ref) ref.current = node;
							}}
							className="relative"
						>
							{editor ? (
								<Provider
									editor={editor}
									containerRef={containerRef}
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
