import React from 'react';
import { Card } from '@/components/ui/Card';
import { DeleteDocumentDialog } from './components/DeleteDocumentDialog';
import { ImagePreviewDialog } from './components/ImagePreviewDialog';
import { useDocumentConfig } from './hooks/use-document-config';
import { PanelBody } from './PanelBody';
import { PanelHeader } from './PanelHeader';
import { InfoProvider } from './Provider';

interface InfoPanelProps {
	readonly onOpenFolder: () => void;
}

const InfoPanelInner: React.FC<InfoPanelProps> = ({ onOpenFolder }) => {
	useDocumentConfig();

	return (
		<>
			<Card className="flex h-full w-full flex-col border-none rounded-none bg-card/55 dark:bg-background p-0! gap-0! ring-0 border-l border-border/70">
				<PanelHeader onOpenFolder={onOpenFolder} />
				<PanelBody />
			</Card>
			<DeleteDocumentDialog />
			<ImagePreviewDialog />
		</>
	);
};

const InfoPanel: React.FC<InfoPanelProps> = (props) => (
	<InfoProvider>
		<InfoPanelInner {...props} />
	</InfoProvider>
);

export default InfoPanel;
