import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, FolderOpen, Upload } from 'lucide-react';
import {
	PageBody,
	PageContainer,
	PageHeader,
	PageHeaderTitle,
} from '@/components/app/base/page';
import { Button } from '@/components/ui/Button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { RESOURCE_SECTIONS } from '../shared/resource-sections';
import { DeleteConfirmDialog } from '@/components/app/dialogs';
import { useContentContext } from './Provider';
import { ExtractorDialog, type ExtractorRunPayload } from './components/ExtractorDialog';
import { MarkdownPreviewDialog } from './components/MarkdownPreviewDialog';
import { DataTable } from './components/DataTable';
import { buildColumns } from './components/columns';
import type { FolderEntry } from '../../../../../shared/types';
import Layout from './Layout';
import { Label } from '@/components/ui/Label';

const DUMMY_FOLDERS: FolderEntry[] = [
	{
		kind: 'folder',
		id: 'research',
		name: 'Research',
		path: '/workspace/contents/Research',
		relativePath: 'Research',
		createdAt: Date.parse('2026-01-12T09:30:00Z'),
		modifiedAt: Date.parse('2026-04-22T14:05:00Z'),
	},
	{
		kind: 'folder',
		id: 'drafts',
		name: 'Drafts',
		path: '/workspace/contents/Drafts',
		relativePath: 'Drafts',
		createdAt: Date.parse('2026-02-03T11:15:00Z'),
		modifiedAt: Date.parse('2026-04-28T08:42:00Z'),
	},
	{
		kind: 'file',
		id: 'roadmap.md',
		name: 'roadmap.md',
		path: '/workspace/contents/roadmap.md',
		relativePath: 'roadmap.md',
		createdAt: Date.parse('2026-03-10T16:00:00Z'),
		modifiedAt: Date.parse('2026-04-29T19:20:00Z'),
	},
	{
		kind: 'file',
		id: 'notes.md',
		name: 'notes.md',
		path: '/workspace/contents/notes.md',
		relativePath: 'notes.md',
		createdAt: Date.parse('2026-03-18T10:45:00Z'),
		modifiedAt: Date.parse('2026-04-25T22:10:00Z'),
	},
	{
		kind: 'file',
		id: 'spec.pdf',
		name: 'spec.pdf',
		path: '/workspace/contents/spec.pdf',
		relativePath: 'spec.pdf',
		createdAt: Date.parse('2026-04-01T07:00:00Z'),
		modifiedAt: Date.parse('2026-04-15T13:30:00Z'),
	},
];

function PageContent(): ReactElement {
	const { t } = useTranslation();
	const section = RESOURCE_SECTIONS.content;
	const [fileDialogOpen, setFileDialogOpen] = useState(false);
	const [previewFolder, setPreviewFolder] = useState<FolderEntry | null>(null);
	const {
		folders,
		filteredFolders,
		isLoading,
		uploading,
		handleUpload,
		handleOpenResourcesFolder,
		handleDeleteOne,
		selected,
		confirmOpen,
		setConfirmOpen,
		handleConfirmDelete,
	} = useContentContext();

	const displayFolders = filteredFolders.length > 0 ? filteredFolders : DUMMY_FOLDERS;
	const hasFolders = folders.length > 0 || DUMMY_FOLDERS.length > 0;

	const columns = useMemo(
		() =>
			buildColumns({
				onPreview: setPreviewFolder,
				onOpenInFinder: handleOpenResourcesFolder,
				onDelete: handleDeleteOne,
			}),
		[handleOpenResourcesFolder, handleDeleteOne],
	);

	const handleExtractorRun = async (payload: ExtractorRunPayload): Promise<void> => {
		const { filePath, modelId } = payload;
		if (!filePath || !modelId) return;
		const result = await window.task.submit({
			type: 'ocr',
			input: { url: filePath, modelId, inputType: 'url' },
			metadata: {},
		});
		if (!result.success) {
			console.error('[ContentPage] OCR submit failed:', result.error.message);
			return;
		}
		setFileDialogOpen(false);
	};

	return (
		<PageContainer>
			<PageHeader>
				<PageHeaderTitle>
					<Label className="w-full text-left text-sm font-medium">{t(section.titleKey)}</Label>
					<DropdownMenu>
						<DropdownMenuTrigger
							render={<Button variant="ghost" size="icon" title="Upload" aria-label="Upload" />}
						>
							<Upload aria-hidden="true" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuGroup>
								<DropdownMenuItem onClick={() => handleUpload(['.md'])}>
									<FileText className="h-4 w-4" />
									Markdown
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => setFileDialogOpen(true)}>
									<Upload className="h-4 w-4" />
									File
								</DropdownMenuItem>
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
					<Button
						variant="ghost"
						size="icon"
						title="Open folder"
						aria-label="Open folder"
						onClick={handleOpenResourcesFolder}
					>
						<FolderOpen aria-hidden="true" />
					</Button>
				</PageHeaderTitle>
			</PageHeader>
			<PageBody>
				{isLoading && (
					<div className="flex flex-1 items-center justify-center py-16">
						<p className="text-sm text-muted-foreground">{t(section.loadingKey)}</p>
					</div>
				)}

				{!isLoading && !hasFolders && (
					<div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
						<div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
							<FileText className="h-7 w-7 text-muted-foreground" />
						</div>
						<div className="space-y-1">
							<p className="font-medium text-sm">{t(section.emptyKey)}</p>
						</div>
						<Button onClick={() => handleUpload()} disabled={uploading} size="sm">
							<Upload />
							{t(section.uploadKey)}
						</Button>
					</div>
				)}

				{!isLoading && hasFolders && (
					<DataTable
						columns={columns}
						data={displayFolders}
						filterColumnId="name"
						filterPlaceholder="Filter by name..."
					/>
				)}
			</PageBody>

			<DeleteConfirmDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title={t('resources.removeItems')}
				description={t('resources.removeConfirm', { count: selected.size })}
				onConfirm={handleConfirmDelete}
				confirmLabel={t('resources.remove')}
			/>
			<ExtractorDialog
				open={fileDialogOpen}
				onOpenChange={setFileDialogOpen}
				onRun={handleExtractorRun}
			/>
			<MarkdownPreviewDialog
				folder={previewFolder}
				open={previewFolder !== null}
				onOpenChange={(open) => {
					if (!open) setPreviewFolder(null);
				}}
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
