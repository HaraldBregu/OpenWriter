import { useMemo, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Calendar,
	Tag,
	Image,
	FolderOpen,
	FileDown,
	FileType,
	Link,
	Plus,
	Trash2,
	Copy,
} from 'lucide-react';
import { useDocumentState, useDocumentDispatch } from '../../hooks';
import {
	AppLabel,
	AppCard,
	AppCardHeader,
	AppCardTitle,
	AppCardContent,
	AppAlertDialog,
	AppAlertDialogAction,
	AppAlertDialogCancel,
	AppAlertDialogContent,
	AppAlertDialogDescription,
	AppAlertDialogFooter,
	AppAlertDialogHeader,
	AppAlertDialogTitle,
} from '@/components/app';
import { ImagePreviewDialog } from '@/components/editor/extensions/image/components/ImagePreviewDialog';

interface ResourcesPanelProps {
	readonly onOpenFolder: () => void;
}

function formatDate(isoString: string, locale: string): string {
	const date = new Date(isoString);
	return date.toLocaleDateString(locale, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';

function readFileAsDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (): void => resolve(reader.result as string);
		reader.onerror = (): void => reject(new Error(`FileReader failed for ${file.name}`));
		reader.readAsDataURL(file);
	});
}

function toLocalResourceUrl(filePath: string): string {
	const normalized = filePath.replace(/\\/g, '/');
	const urlPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
	return `local-resource://localhost${urlPath}`;
}

const ResourcesPanel: React.FC<ResourcesPanelProps> = ({ onOpenFolder }) => {
	const { t, i18n } = useTranslation();
	const { documentId, metadata, images } = useDocumentState();
	const dispatch = useDocumentDispatch();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);

	const handleOpenImagesFolder = useCallback(() => {
		if (!documentId) return;
		window.workspace.openDocumentImagesFolder(documentId);
	}, [documentId]);

	const handleUploadClick = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const handleFileChange = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (!files || files.length === 0 || !documentId) return;

			for (const file of Array.from(files)) {
				try {
					const dataUri = await readFileAsDataUri(file);
					const match = dataUri.match(/^data:image\/(\w+);base64,(.+)$/);
					if (match) {
						const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
						const base64 = match[2];
						const fileName = `${crypto.randomUUID()}.${ext}`;
						await window.workspace.saveDocumentImage({
							documentId,
							fileName,
							base64,
						});
					}
				} catch {
					/* skip failed files */
				}
			}

			e.target.value = '';

			try {
				const updated = await window.workspace.listDocumentImages(documentId);
				dispatch({ type: 'IMAGES_UPDATED', images: updated });
			} catch {
				/* file watcher will pick it up */
			}
		},
		[documentId, dispatch]
	);

	const formattedDate = useMemo(() => {
		const iso = metadata?.updatedAt ?? metadata?.createdAt;
		return iso ? formatDate(iso, i18n.language) : null;
	}, [metadata?.updatedAt, metadata?.createdAt, i18n.language]);

	const sectionClassName =
		'rounded-2xl border border-border/70 bg-card/75 p-3 shadow-none backdrop-blur-sm dark:bg-background/45';
	const actionButtonClassName =
		'flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-foreground/85 transition-colors hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60';

	const handleDeletePermanently = useCallback(async () => {
		if (!documentId || isDeleting) return;

		setIsDeleting(true);
		try {
			await window.workspace.deleteOutput({ type: 'documents', id: documentId });
			setConfirmDeleteOpen(false);
		} finally {
			setIsDeleting(false);
		}
	}, [documentId, isDeleting]);

	return (
		<>
			<div className="flex w-full flex-col overflow-y-auto overflow-x-hidden border-l border-border/70 bg-card/55 dark:bg-background">
				<AppCard className="w-full flex flex-col flex-1 min-h-0 rounded-none border-none bg-transparent shadow-none">
					{metadata && (
						<AppCardHeader className="p-4 pb-0">
							<AppCardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground/70">
								{t('configSidebar.documentInfo')}
								<button
									type="button"
									onClick={onOpenFolder}
									className="rounded-full p-1 text-muted-foreground/70 transition-colors hover:bg-accent/75 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									aria-label={t('common.openFolder')}
									title={t('common.openFolder')}
								>
									<FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
								</button>
							</AppCardTitle>
							<div className={`${sectionClassName} mt-3 space-y-3`}>
								<div className="space-y-1">
									<AppLabel className="text-xs text-muted-foreground">
										{t('configSidebar.documentTitle')}
									</AppLabel>
									<div className="truncate text-sm font-medium text-foreground">
										{metadata.title}
									</div>
								</div>
								<div className="space-y-1">
									<AppLabel className="text-xs text-muted-foreground">
										{t('configSidebar.documentType')}
									</AppLabel>
									<div className="flex items-center gap-1.5">
										<Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
										<span className="text-sm text-foreground capitalize">{metadata.type}</span>
									</div>
								</div>
								{formattedDate && (
									<div className="space-y-1">
										<AppLabel className="text-xs text-muted-foreground">
											{t('configSidebar.updatedAt')}
										</AppLabel>
										<div className="flex items-center gap-1.5">
											<Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
											<span className="text-sm text-foreground">{formattedDate}</span>
										</div>
									</div>
								)}
							</div>
						</AppCardHeader>
					)}

					<AppCardContent className="flex-1 space-y-4 p-4">
						{documentId && (
							<>
								<input
									ref={fileInputRef}
									type="file"
									accept={ACCEPTED_IMAGE_TYPES}
									multiple
									className="hidden"
									onChange={handleFileChange}
								/>
								<div className={sectionClassName}>
									<div className="mb-3 flex items-center justify-between gap-2">
										<span className="text-xs font-medium text-muted-foreground/70">
											{t('configSidebar.images')}
										</span>
										<div className="flex items-center gap-1.5">
											<span className="text-[11px] text-muted-foreground">{images.length}</span>
											<button
												type="button"
												onClick={handleOpenImagesFolder}
												className="rounded-full p-1 text-muted-foreground/70 transition-colors hover:bg-accent/75 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
												aria-label={t('common.openFolder')}
												title={t('common.openFolder')}
											>
												<FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
											</button>
										</div>
									</div>
									{images.length > 0 ? (
										<div className="grid grid-cols-3 gap-2.5">
											{images.map((img) => (
												<div
													key={img.fileName}
													className="group relative aspect-square overflow-hidden rounded-xl border border-border/70 bg-accent/45 dark:bg-muted/40"
												>
													<img
														src={toLocalResourceUrl(img.filePath)}
														alt={img.fileName}
														className="h-full w-full object-cover"
														loading="lazy"
													/>
													<div className="absolute inset-x-0 bottom-0 bg-black/55 px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100">
														<span className="block truncate text-[10px] text-white">
															{img.fileName}
														</span>
													</div>
												</div>
											))}
											<button
												type="button"
												onClick={handleUploadClick}
												className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/65 text-muted-foreground transition-colors hover:border-foreground/25 hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-background/40"
												aria-label={t('configSidebar.uploadImage')}
												title={t('configSidebar.uploadImage')}
											>
												<Plus className="h-4 w-4" />
											</button>
										</div>
									) : (
										<button
											type="button"
											onClick={handleUploadClick}
											className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-card/65 px-3 py-4 text-muted-foreground transition-colors hover:border-foreground/25 hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-background/40"
											aria-label={t('configSidebar.uploadImage')}
										>
											<Image className="h-4 w-4 shrink-0" />
											<span className="text-xs">{t('configSidebar.uploadImage')}</span>
										</button>
									)}
								</div>
							</>
						)}

						{documentId && (
							<div className={sectionClassName}>
								<div className="mb-2">
									<span className="text-xs font-medium text-muted-foreground/70">
										{t('configSidebar.export')}
									</span>
								</div>
								<div className="space-y-1">
									<button type="button" className={actionButtonClassName}>
										<FileDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
										{t('configSidebar.exportPdf')}
									</button>
									<button type="button" className={actionButtonClassName}>
										<FileType className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
										{t('configSidebar.exportMd')}
									</button>
								</div>
							</div>
						)}

						{documentId && (
							<div className={sectionClassName}>
								<div className="mb-2">
									<span className="text-xs font-medium text-muted-foreground/70">
										{t('configSidebar.share')}
									</span>
								</div>
								<div className="space-y-1">
									<button type="button" className={actionButtonClassName}>
										<Link className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
										{t('configSidebar.shareLink')}
									</button>
								</div>
							</div>
						)}

						{documentId && (
							<div className={sectionClassName}>
								<div className="mb-2">
									<span className="text-xs font-medium text-muted-foreground/70">
										{t('configSidebar.actions')}
									</span>
								</div>
								<div className="space-y-1">
									<button type="button" className={actionButtonClassName}>
										<Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
										{t('configSidebar.duplicate')}
									</button>
									<button
										type="button"
										onClick={() => setConfirmDeleteOpen(true)}
										disabled={isDeleting}
										className={`${actionButtonClassName} hover:bg-destructive/10 hover:text-destructive`}
									>
										<Trash2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
										{t('configSidebar.deletePermanently')}
									</button>
								</div>
							</div>
						)}
					</AppCardContent>
				</AppCard>
			</div>

			<AppAlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
				<AppAlertDialogContent>
					<AppAlertDialogHeader>
						<AppAlertDialogTitle>{t('configSidebar.deleteDocumentTitle')}</AppAlertDialogTitle>
						<AppAlertDialogDescription>
							{t('configSidebar.deleteDocumentConfirm')}
						</AppAlertDialogDescription>
					</AppAlertDialogHeader>
					<AppAlertDialogFooter>
						<AppAlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AppAlertDialogCancel>
						<AppAlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={handleDeletePermanently}
							disabled={isDeleting}
						>
							{t('configSidebar.deletePermanently')}
						</AppAlertDialogAction>
					</AppAlertDialogFooter>
				</AppAlertDialogContent>
			</AppAlertDialog>
		</>
	);
};

export default ResourcesPanel;
