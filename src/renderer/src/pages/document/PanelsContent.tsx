import React, { useCallback } from 'react';
import InfoPanel from './panels/info/InfoPanel';
import Chat from './panels/chat';
import { useSidebarVisibility } from './providers';

interface PanelsContentProps {
	readonly documentId: string | undefined;
}

const PanelsContent: React.FC<PanelsContentProps> = ({ documentId }) => {
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

export default PanelsContent;
