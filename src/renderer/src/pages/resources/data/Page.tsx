import type { ReactElement } from 'react';
import { FolderOpen, Pencil, Trash2, Upload, X } from 'lucide-react';
import {
	PageBody,
	PageContainer,
	PageHeader,
	PageHeaderItems,
	PageHeaderTitle,
} from '@/components/app/base/Page';
import { Button } from '@/components/ui/Button';
import Layout from './Layout';
import { useContext } from './hooks/use-context';
import { KnowledgeBaseCard } from './components/KnowledgeBaseCard';
import { KnowledgeBaseDialog } from './components/KnowledgeBaseDialog';
import { DataIndexingBar } from './components/DataIndexingBar';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';

function PageContent(): ReactElement {
	const {
		selected,
		uploading,
		editing,
		handleToggleEdit,
		handleDelete,
		handleOpenResourcesFolder,
		handleUpload,
		kbDialogOpen,
		setKbDialogOpen,
	} = useContext();

	return (
		<PageContainer>
			<PageHeader>
				<PageHeaderTitle>Data</PageHeaderTitle>
				<PageHeaderItems>
					{editing && selected.size > 0 && (
						<Button variant="destructive" size="lg" onClick={handleDelete}>
							<Trash2 />
							Delete ({selected.size})
						</Button>
					)}
					{!editing && (
						<>
							<Button variant="outline" size="lg" onClick={handleOpenResourcesFolder}>
								<FolderOpen />
							</Button>
							<Button size="lg" onClick={handleUpload} disabled={uploading}>
								<Upload />
								Upload
							</Button>
						</>
					)}
					<Button variant="outline" size="lg" onClick={handleToggleEdit}>
						{editing ? (
							<>
								<X />
								Done
							</>
						) : (
							<>
								<Pencil />
								Edit
							</>
						)}
					</Button>
				</PageHeaderItems>
			</PageHeader>
			<DataIndexingBar />
			<PageBody>
				<div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
					<KnowledgeBaseCard
						onCreateClick={() => setKbDialogOpen(true)}
						disabled={uploading}
					/>
				</div>
			</PageBody>
			<KnowledgeBaseDialog open={kbDialogOpen} onOpenChange={setKbDialogOpen} />
			<DeleteConfirmDialog />
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
