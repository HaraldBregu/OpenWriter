import { useTranslation } from 'react-i18next';
import { useDocumentState } from '../../hooks';
import { ActionsSection } from './components/ActionsSection';
import { DocumentMetaSection } from './components/DocumentMetaSection';
import { ImagesSection } from './components/ImagesSection';
import { PdfExportSection } from './components/PdfExportSection';
import { useInfoState } from './hooks/use-info-state';

export function PanelBody(): React.ReactElement {
	const { t } = useTranslation();
	const { documentId } = useDocumentState();
	const { documentConfig } = useInfoState();

	return (
		<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pt-2 pb-6 space-y-2">
			<DocumentMetaSection />
			<ImagesSection />
			{documentId && documentConfig && (
				<PdfExportSection
					exportLabel={t('configSidebar.exportPdf')}
					downloadLabel={t('common.download')}
					previewLabel={t('common.preview')}
				/>
			)}
			<ActionsSection />
		</div>
	);
}
