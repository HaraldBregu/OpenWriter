import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Info, Download, Trash2, FolderOpen, Clock, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
	Popover,
	PopoverContent,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from '@/components/ui/Popover';
import {
	Item,
	ItemContent,
	ItemDescription,
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
					<PopoverHeader className="p-4">
						<PopoverTitle className="truncate">{displayTitle}</PopoverTitle>
					</PopoverHeader>
					<div className="border-t p-2">
						<Button
							variant="ghost"
							size="lg"
							onClick={handleOpenFolder}
							disabled={!documentId}
							className="w-full justify-start font-normal"
						>
							<FolderOpen className="text-muted-foreground" aria-hidden="true" />
							<span className="truncate">{t('configSidebar.openFolder', 'Open folder')}</span>
						</Button>
					</div>
					{(createdAtLabel || lastUpdatedLabel) && (
						<div className="border-t p-2">
							{createdAtLabel && (
								<Item size="xs">
									<ItemMedia variant="icon">
										<CalendarDays className="text-muted-foreground" aria-hidden="true" />
									</ItemMedia>
									<ItemContent>
										<ItemTitle>{t('configSidebar.created', 'Created')}</ItemTitle>
										<ItemDescription>{createdAtLabel}</ItemDescription>
									</ItemContent>
								</Item>
							)}
							{lastUpdatedLabel && (
								<Item size="xs">
									<ItemMedia variant="icon">
										<Clock className="text-muted-foreground" aria-hidden="true" />
									</ItemMedia>
									<ItemContent>
										<ItemTitle>{t('configSidebar.lastUpdated', 'Last updated')}</ItemTitle>
										<ItemDescription>{lastUpdatedLabel}</ItemDescription>
									</ItemContent>
								</Item>
							)}
						</div>
					)}
					<div className="border-t p-2">
						<Button
							variant="ghost"
							size="lg"
							onClick={handleExport}
							disabled={!documentId}
							className="w-full justify-start font-normal"
						>
							<Download className="text-muted-foreground" aria-hidden="true" />
							<span className="truncate">{t('configSidebar.export', 'Export')}</span>
						</Button>
						<Button
							variant="ghost"
							size="lg"
							onClick={() => setConfirmDeleteOpen(true)}
							disabled={!documentId || isDeleting}
							className="w-full justify-start font-normal text-destructive hover:bg-destructive/10 hover:text-destructive"
						>
							<Trash2 aria-hidden="true" />
							<span className="truncate">
								{t('configSidebar.deletePermanently', 'Delete permanently')}
							</span>
						</Button>
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
