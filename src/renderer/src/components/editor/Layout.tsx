import { forwardRef, type ReactNode, type Ref } from 'react';
import { cn } from '@/lib/utils';
import { GUTTER_WIDTH } from './components/BlockControls';

interface LayoutProps {
	readonly id?: string;
	readonly className?: string;
	readonly containerRef?: Ref<HTMLDivElement>;
	readonly children: ReactNode;
}

const Layout = forwardRef<HTMLDivElement, LayoutProps>(
	({ id, className, containerRef, children }, ref) => (
		<div id={id} className={cn('w-full', className)}>
			<div className="relative w-full" ref={ref}>
				<div
					ref={containerRef}
					className="relative"
					style={{ paddingLeft: GUTTER_WIDTH, paddingRight: GUTTER_WIDTH }}
				>
					{children}
				</div>
			</div>
		</div>
	)
);
Layout.displayName = 'Layout';

export default Layout;
