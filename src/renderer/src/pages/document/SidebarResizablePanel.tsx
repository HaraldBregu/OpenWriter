import React from 'react';
import type { PanelImperativeHandle } from 'react-resizable-panels';
import { ResizablePanel } from '@/components/ui/Resizable';
import EditorPanel from './EditorPanel';
import ConfigPanel from './ConfigPanel';
import AgenticPanel from './AgenticPanel';

interface SidebarResizablePanelProps {
	readonly panelRef: React.RefObject<PanelImperativeHandle | null>;
	readonly activeSidebar: 'editor' | 'config' | 'agentic' | null | undefined;
	readonly onOpenFolder: () => void;
}

const SidebarResizablePanel: React.FC<SidebarResizablePanelProps> = ({
	panelRef,
	activeSidebar,
	onOpenFolder,
}) => {
	return (
		<ResizablePanel
			panelRef={panelRef}
			defaultSize="30%"
			minSize="25%"
			maxSize="40%"
			collapsible
			collapsedSize="0%"
		>
			<div className="h-full">
				{activeSidebar === 'editor' && <EditorPanel />}
				{activeSidebar === 'config' && <ConfigPanel onOpenFolder={onOpenFolder} />}
				{activeSidebar === 'agentic' && <AgenticPanel />}
			</div>
		</ResizablePanel>
	);
};

export default SidebarResizablePanel;
