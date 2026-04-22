import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Info, Download, Trash2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/AlertDialog';

interface DocumentInfoPopoverProps {
	readonly documentId: string | null;
	readonly title: string;
	readonly content: string;
}

function sanitizeFileName(name: string): string {
	const trimmed = name.trim() || 'document';
	return trimmed.replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120);
}

export default function DocumentInfoPopover({
	documentId,
	title,
	content,
}: DocumentInfoPopoverProps): React.ReactElement {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [documentPath, setDocumentPath] = useState<string>('');
	const [open, setOpen] = useState(false);
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		if (!documentId || !open) return;
		let cancelled = false;
		window.workspace
			.getDocumentPath(documentId)
			.then((path) => {
				if (!cancelled) setDocumentPath(path);
			})
			.catch(() => {
				if (!cancelled) setDocumentPath('');
			});
		return () => {
			cancelled = true;
		};
	}, [documentId, open]);

	const handleOpenFolder = useCallback(() => {
		if (!documentId) return;
		window.workspace.openDocumentFolder(documentId);
	}, [documentId]);

	const handleExport = useCallback(() => {
		const fileName = `${sanitizeFileName(title)}.md`;
		const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = fileName;
		document.body.appendChild(anchor);
		anchor.click();
		document.body.removeChild(anchor);
		URL.revokeObjectURL(url);
		setOpen(false);
	}, [title, content]);

	const handleDelete = useCallback(async () => {
		if (!documentId || isDeleting) return;
		setIsDeleting(true);
		try {
			await window.workspace.deleteOutput({ type: 'documents', id: documentId });
			setConfirmDeleteOpen(false);
			setOpen(false);
			navigate('/home', { replace: true });
		} finally {
			setIsDeleting(false);
		}
	}, [documentId, isDeleting, navigate]);

	const displayTitle = title.trim() || t('sidebar.untitledWriting', 'Untitled');

	return (
		<>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger
					render={
						<Button
							variant="ghost"
							size="icon"
							title={t('configSidebar.documentInfo', 'Document info')}
							aria-label={t('configSidebar.documentInfo', 'Document info')}
						>
							<Info aria-hidden="true" />
						</Button>
					}
				/>
				<PopoverContent align="end" className="w-80 p-0">
					<div className="space-y-3 p-4">
						<div className="space-y-1">
							<p className="text-xs uppercase tracking-wide text-muted-foreground">
								{t('common.name', 'Name')}
							</p>
							<p className="text-sm font-medium text-foreground break-words">{displayTitle}</p>
						</div>
						<div className="space-y-1">
							<p className="text-xs uppercase tracking-wide text-muted-foreground">
								{t('projectSettings.path', 'Path')}
							</p>
							<button
								type="button"
								onClick={handleOpenFolder}
								disabled={!documentPath}
								className="group flex w-full items-start gap-2 rounded-md text-left text-sm text-foreground/85 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
								title={documentPath || ''}
							>
								<FolderOpen
									className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground group-hover:text-foreground"
									aria-hidden="true"
								/>
								<span className="break-all text-xs font-mono text-muted-foreground group-hover:text-foreground">
									{documentPath || '—'}
								</span>
							</button>
						</div>
					</div>
					<div className="border-t p-2">
						<button
							type="button"
							onClick={handleExport}
							disabled={!documentId}
							className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground/85 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60"
						>
							<Download
								className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
								aria-hidden="true"
							/>
							{t('configSidebar.export', 'Export')}
						</button>
						<button
							type="button"
							onClick={() => setConfirmDeleteOpen(true)}
							disabled={!documentId || isDeleting}
							className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground/85 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60"
						>
							<Trash2
								className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
								aria-hidden="true"
							/>
							{t('configSidebar.deletePermanently', 'Delete permanently')}
						</button>
					</div>
				</PopoverContent>
			</Popover>

			<AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
				<AlertDialogContent size="sm">
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t('configSidebar.deleteDocumentTitle', 'Delete document permanently')}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t(
								'configSidebar.deleteDocumentConfirm',
								'Are you sure you want to permanently delete this document from the workspace? This action cannot be undone.'
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>
							{t('common.cancel', 'Cancel')}
						</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={handleDelete}
							disabled={isDeleting}
						>
							{t('common.delete', 'Delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
