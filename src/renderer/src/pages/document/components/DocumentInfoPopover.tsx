import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Info, Download, Trash2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from '@/components/ui/Popover';
import {
	Item,
	ItemContent,
	ItemGroup,
	ItemMedia,
	ItemTitle,
} from '@/components/ui/Item';
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

interface DocumentInfoPopoverProps {
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

export default function DocumentInfoPopover({
	documentId,
	title,
	content,
}: DocumentInfoPopoverProps): React.ReactElement {
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
		const iso = documentConfig?.updatedAt ?? documentConfig?.createdAt;
		if (!iso) return null;
		return formatDate(iso, i18n.language);
	}, [documentConfig?.updatedAt, documentConfig?.createdAt, i18n.language]);

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
				<PopoverContent align="end" className="w-64 p-0">
					<PopoverHeader className="flex flex-row items-start justify-between gap-3 p-4 pb-3">
						<div className="flex min-w-0 flex-1 flex-col gap-1">
							<PopoverTitle className="truncate">{displayTitle}</PopoverTitle>
							{lastUpdatedLabel && (
								<PopoverDescription>{lastUpdatedLabel}</PopoverDescription>
							)}
						</div>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={handleOpenFolder}
							disabled={!documentId}
							title={t('configSidebar.openFolder', 'Open folder')}
							aria-label={t('configSidebar.openFolder', 'Open folder')}
						>
							<FolderOpen aria-hidden="true" />
						</Button>
					</PopoverHeader>
					<div className="border-t p-2">
						<ItemGroup>
							<Item
								size="xs"
								render={
									<button
										type="button"
										onClick={handleExport}
										disabled={!documentId}
										className="w-full cursor-pointer text-left hover:bg-accent disabled:pointer-events-none disabled:opacity-60"
									/>
								}
							>
								<ItemMedia variant="icon">
									<Download className="text-muted-foreground" aria-hidden="true" />
								</ItemMedia>
								<ItemContent>
									<ItemTitle>{t('configSidebar.export', 'Export')}</ItemTitle>
								</ItemContent>
							</Item>
							<Item
								size="xs"
								render={
									<button
										type="button"
										onClick={() => setConfirmDeleteOpen(true)}
										disabled={!documentId || isDeleting}
										className="w-full cursor-pointer text-left text-destructive hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-60"
									/>
								}
							>
								<ItemMedia variant="icon">
									<Trash2 aria-hidden="true" />
								</ItemMedia>
								<ItemContent>
									<ItemTitle>
										{t('configSidebar.deletePermanently', 'Delete permanently')}
									</ItemTitle>
								</ItemContent>
							</Item>
						</ItemGroup>
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
