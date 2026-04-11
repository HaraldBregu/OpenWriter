import { lazy, Suspense, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, FolderOpen, Pencil, Search, Trash2, Upload, X } from 'lucide-react';
import {
	PageBody,
	PageContainer,
	PageHeader,
	PageHeaderItems,
	PageHeaderTitle,
	PageSubHeader,
} from '@/components/app/base/Page';
import { Button } from '@/components/ui/Button';
import { ButtonGroup } from '@/components/ui/ButtonGroup';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from '@/components/ui/InputGroup';
import { RESOURCE_SECTIONS } from '../shared/resource-sections';
import { useContentContext } from './context/ContentContext';
import { ContentTable } from './components/ContentTable';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import Layout from './Layout';

const ResourcePreviewSheet = lazy(() =>
	import('../shared/ResourcePreviewSheet').then((module) => ({
		default: module.ResourcePreviewSheet,
	}))
);

function PageContent(): ReactElement {
	const { t } = useTranslation();
	const section = RESOURCE_SECTIONS.content;
	const {
		resources,
		isLoading,
		error,
		uploading,
		removing,
		editing,
		selected,
		searchQuery,
		setSearchQuery,
		handleUpload,
		handleOpenResourcesFolder,
		handleDelete,
		handleToggleEdit,
		previewResource,
		setPreviewResource,
	} = useContentContext();

	return (
		<PageContainer>
			<PageHeader>
				<PageHeaderTitle>{t(section.titleKey)}</PageHeaderTitle>
				<PageHeaderItems>
					{editing && selected.size > 0 && (
						<Button variant="destructive" size="lg" disabled={removing} onClick={handleDelete}>
							<Trash2 />
							{t('resources.removeWithCount', { count: selected.size })}
						</Button>
					)}
					{!editing && (
						<>
							<Button variant="outline" size="lg" onClick={handleOpenResourcesFolder}>
								<FolderOpen />
							</Button>
							<Button size="lg" onClick={handleUpload} disabled={uploading}>
								<Upload />
								{t(section.uploadKey)}
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
			<PageSubHeader>
				<ButtonGroup className="min-w-0 flex-1">
					<InputGroup>
						<InputGroupAddon>
							<InputGroupText>
								<Search />
							</InputGroupText>
						</InputGroupAddon>
						<InputGroupInput
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder={t(section.searchPlaceholderKey)}
						/>
					</InputGroup>
				</ButtonGroup>
			</PageSubHeader>
			<PageBody>
				{isLoading && (
					<div className="flex flex-1 items-center justify-center py-16">
						<p className="text-sm text-muted-foreground">{t(section.loadingKey)}</p>
					</div>
				)}

				{error && (
					<div className="m-6 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
						{error}
					</div>
				)}

				{!isLoading && !error && resources.length === 0 && (
					<div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
						<div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
							<FileText className="h-7 w-7 text-muted-foreground" />
						</div>
						<div className="space-y-1">
							<p className="font-medium text-sm">{t(section.emptyKey)}</p>
						</div>
						<Button onClick={handleUpload} disabled={uploading} size="sm">
							<Upload />
							{t(section.uploadKey)}
						</Button>
					</div>
				)}

				{!isLoading && !error && resources.length > 0 && <ContentTable />}
			</PageBody>

			{previewResource && (
				<Suspense fallback={null}>
					<ResourcePreviewSheet
						resource={previewResource}
						onClose={() => setPreviewResource(null)}
					/>
				</Suspense>
			)}

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
