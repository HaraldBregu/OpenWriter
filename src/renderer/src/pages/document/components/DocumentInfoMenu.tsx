import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Info, Download, Trash2, FolderOpen, Clock, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
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
import type { DocumentConfig } from '@shared/index';

interface DocumentInfoMenuProps {
	readonly documentId: string | null;
	readonly title: string;
	readonly content: string;
}

function sanitizeFileName(name: string): string {
	const trimmed = name.trim() || 'document';
	return trimmed.replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120);
}

function formatDate(isoString: string, locale: string): string {
	const date = new Date(isoString);
	return date.toLocaleDateString(locale, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	});
}

export default function DocumentInfoMenu({
	documentId,
	title,
	content,
}: DocumentInfoMenuProps): React.ReactElement {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const [documentConfig, setDocumentConfig] = useState<DocumentConfig | null>(null);
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		if (!documentId || !open) return;
		let cancelled = false;
		window.workspace
			.getDocumentConfig(documentId)
			.then((config) => {
				if (!cancelled) setDocumentConfig(config);
			})
			.catch(() => {
				if (!cancelled) setDocumentConfig(null);
			});
		return () => {
			cancelled = true;
		};
	}, [documentId, open]);

	const lastUpdatedLabel = useMemo(() => {
		const iso = documentConfig?.updatedAt;
		if (!iso) return null;
		return formatDate(iso, i18n.language);
	}, [documentConfig?.updatedAt, i18n.language]);

	const createdAtLabel = useMemo(() => {
		const iso = documentConfig?.createdAt;
		if (!iso) return null;
		return formatDate(iso, i18n.language);
	}, [documentConfig?.createdAt, i18n.language]);

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
			<DropdownMenu open={open} onOpenChange={setOpen}>
				<DropdownMenuTrigger
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
				<DropdownMenuContent align="end" className="w-64">
					<DropdownMenuLabel className="truncate text-sm font-medium text-foreground">
						{displayTitle}
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						<DropdownMenuItem onClick={handleOpenFolder} disabled={!documentId}>
							<FolderOpen className="text-muted-foreground" aria-hidden="true" />
							<span className="truncate">{t('configSidebar.openFolder', 'Open folder')}</span>
						</DropdownMenuItem>
					</DropdownMenuGroup>
					{(createdAtLabel || lastUpdatedLabel) && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuGroup>
								{createdAtLabel && (
									<DropdownMenuItem disabled className="opacity-100! data-disabled:opacity-100!">
										<CalendarDays className="text-muted-foreground" aria-hidden="true" />
										<div className="flex min-w-0 flex-col">
											<span className="text-xs font-medium">
												{t('configSidebar.created', 'Created')}
											</span>
											<span className="truncate text-xs text-muted-foreground">
												{createdAtLabel}
											</span>
										</div>
									</DropdownMenuItem>
								)}
								{lastUpdatedLabel && (
									<DropdownMenuItem disabled className="opacity-100! data-disabled:opacity-100!">
										<Clock className="text-muted-foreground" aria-hidden="true" />
										<div className="flex min-w-0 flex-col">
											<span className="text-xs font-medium">
												{t('configSidebar.lastUpdated', 'Last updated')}
											</span>
											<span className="truncate text-xs text-muted-foreground">
												{lastUpdatedLabel}
											</span>
										</div>
									</DropdownMenuItem>
								)}
							</DropdownMenuGroup>
						</>
					)}
					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						<DropdownMenuItem onClick={handleExport} disabled={!documentId}>
							<Download className="text-muted-foreground" aria-hidden="true" />
							<span className="truncate">{t('configSidebar.export', 'Export')}</span>
						</DropdownMenuItem>
						<DropdownMenuItem
							variant="destructive"
							onClick={(event) => {
								event.preventDefault();
								setConfirmDeleteOpen(true);
							}}
							disabled={!documentId || isDeleting}
						>
							<Trash2 aria-hidden="true" />
							<span className="truncate">
								{t('configSidebar.deletePermanently', 'Delete permanently')}
							</span>
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>

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
