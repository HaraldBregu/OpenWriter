import React, { useCallback, useEffect } from 'react';
import { usePanelRef } from 'react-resizable-panels';
import ResourcesPanel from './panels/resources/ResourcesPanel';
import Chat from './panels/chat';
import { useSidebarVisibility } from './providers';
import { ResizableHandle, ResizablePanel } from '@/components/ui/Resizable';

interface SidePanelsContentProps {
	readonly documentId: string | undefined;
}

const SidePanelsContent: React.FC<SidePanelsContentProps> = ({ documentId }) => {
	const { activeSidebar } = useSidebarVisibility();
	const sidebarPanelRef = usePanelRef();

	useEffect(() => {
		if (activeSidebar) {
			sidebarPanelRef.current?.expand();
		} else {
			sidebarPanelRef.current?.collapse();
		}
	}, [activeSidebar, sidebarPanelRef]);

	const handleOpenFolder = useCallback(() => {
		if (!documentId) return;
		window.workspace.openDocumentFolder(documentId);
	}, [documentId]);

	return (
		<>
			{activeSidebar && <ResizableHandle />}
			<ResizablePanel
				panelRef={sidebarPanelRef}
				defaultSize="30%"
				minSize="30%"
				maxSize="50%"
				collapsible
				collapsedSize="0%"
			>
				<div className="h-full">
					{activeSidebar === 'config' && <ResourcesPanel onOpenFolder={handleOpenFolder} />}
					{activeSidebar === 'agentic' && <Chat />}
				</div>
			</ResizablePanel>
		</>
	);
};

export default SidePanelsContent;
