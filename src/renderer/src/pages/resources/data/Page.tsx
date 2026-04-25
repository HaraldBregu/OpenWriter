import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, FolderOpen, Plus } from 'lucide-react';
import {
	PageBody,
	PageContainer,
	PageHeader,
	PageHeaderTitle,
} from '@/components/app/base/page';
import { Button } from '@/components/ui/Button';
import { DeleteConfirmDialog } from '@/components/app/dialogs';
import Layout from './Layout';
import { useContext } from './hooks/use-context';
import { KnowledgeBaseGrid } from './components/KnowledgeBaseGrid';
import { KnowledgeBaseDialog } from './components/KnowledgeBaseDialog';
import { DataIndexingBar } from './components/DataIndexingBar';

function PageContent(): ReactElement {
	const { t } = useTranslation();
	const {
		selected,
		uploading,
		handleOpenResourcesFolder,
		kbDialogOpen,
		setKbDialogOpen,
		confirmOpen,
		setConfirmOpen,
		handleConfirmDelete,
		knowledgeBases,
	} = useContext();

	return (
		<PageContainer>
			<PageHeader>
				<PageHeaderTitle>
					<Database className="h-4 w-4" aria-hidden="true" />
					Knowledge Base
					<Button
						variant="ghost"
						size="icon"
						title="Open folder"
						aria-label="Open folder"
						onClick={handleOpenResourcesFolder}
					>
						<FolderOpen aria-hidden="true" />
					</Button>
					{knowledgeBases.length > 0 && (
						<Button
							variant="ghost"
							size="icon"
							title="New knowledge base"
							aria-label="New knowledge base"
							onClick={() => setKbDialogOpen(true)}
							disabled={uploading}
						>
							<Plus aria-hidden="true" />
						</Button>
					)}
				</PageHeaderTitle>
			</PageHeader>
			<DataIndexingBar />
			<PageBody>
				<KnowledgeBaseGrid />
			</PageBody>
			<KnowledgeBaseDialog open={kbDialogOpen} onOpenChange={setKbDialogOpen} />
			<DeleteConfirmDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title={t('resources.removeItems')}
				description={t('resources.removeConfirm', { count: selected.size })}
				onConfirm={handleConfirmDelete}
				confirmLabel={t('resources.remove')}
			/>
		</PageContainer>
	);
}

export default function Page(): ReactElement {
	return (
		<Layout>
			<PageContent />
		</Layout>
	);
}
