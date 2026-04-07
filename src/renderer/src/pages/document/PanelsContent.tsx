import React, { useCallback } from 'react';
import ResourcesPanel from './panels/resources/ResourcesPanel';
import Chat from './panels/chat';
import { useSidebarVisibility } from './providers';

interface SidePanelsContentProps {
	readonly documentId: string | undefined;
}

const SidePanelsContent: React.FC<SidePanelsContentProps> = ({ documentId }) => {
	const { activeSidebar } = useSidebarVisibility();

	const handleOpenFolder = useCallback(() => {
		if (!documentId) return;
		window.workspace.openDocumentFolder(documentId);
	}, [documentId]);

	return (
		<div className="h-full">
			{activeSidebar === 'config' && <ResourcesPanel onOpenFolder={handleOpenFolder} />}
			{activeSidebar === 'agentic' && <Chat />}
		</div>
	);
};

export default SidePanelsContent;
