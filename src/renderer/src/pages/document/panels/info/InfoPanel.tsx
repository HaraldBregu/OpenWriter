import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Calendar,
	Tag,
	Image,
	FolderOpen,
	Link,
	Plus,
	Trash2,
	Copy,
	PenLine,
	ImageIcon,
} from 'lucide-react';
import { useDocumentState, useDocumentDispatch } from '../../hooks';
import { PdfExportSection } from './components/PdfExportSection';
import { findModelById, DEFAULT_IMAGE_MODEL_ID } from '../../../../../../shared/models';
import { DEFAULT_TEXT_MODEL_ID } from '../../../../../../shared/types';
import type { DocumentConfig } from '../../../../../../shared/types';
import {
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
import { SectionHeader, SettingRow } from '@pages/settings/SettingsComponents';

interface InfoPanelProps {
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

const ICON_BUTTON_CLASS =
	'rounded-full p-1 text-muted-foreground/70 transition-colors hover:bg-accent/75 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const ACTION_BUTTON_CLASS =
	'flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-foreground/85 transition-colors hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60';

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

const InfoPanel: React.FC<InfoPanelProps> = ({ onOpenFolder }) => {
	const { t, i18n } = useTranslation();
	const { documentId, images } = useDocumentState();
	const dispatch = useDocumentDispatch();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);
	const [documentConfig, setDocumentConfig] = useState<DocumentConfig | null>(null);

	useEffect(() => {
		if (!documentId) return;
		let cancelled = false;

		(async () => {
			try {
				const config = await window.workspace.getDocumentConfig(documentId);
				if (!cancelled) setDocumentConfig(config);
			} catch {
				// workspace not ready yet
			}
		})();

		const unsubscribe = window.workspace.onDocumentConfigChanges(documentId, (config) => {
			if (!cancelled) setDocumentConfig(config);
		});

		return () => {
			cancelled = true;
			unsubscribe();
		};
	}, [documentId]);

	const textModelName = useMemo(() => {
		if (!documentConfig) return findModelById(DEFAULT_TEXT_MODEL_ID)?.name ?? DEFAULT_TEXT_MODEL_ID;
		return findModelById(documentConfig.textModel)?.name ?? documentConfig.textModel;
	}, [documentConfig]);

	const imageModelName = useMemo(() => {
		if (!documentConfig)
			return findModelById(DEFAULT_IMAGE_MODEL_ID)?.name ?? DEFAULT_IMAGE_MODEL_ID;
		return findModelById(documentConfig.imageModel)?.name ?? documentConfig.imageModel;
	}, [documentConfig]);

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
		const iso = documentConfig?.updatedAt ?? documentConfig?.createdAt;
		return iso ? formatDate(iso, i18n.language) : null;
	}, [documentConfig?.updatedAt, documentConfig?.createdAt, i18n.language]);

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
			<div className="flex w-full flex-col overflow-hidden border-l border-border/70 bg-card/55 dark:bg-background">
				<div className="shrink-0 border-b border-border/80 bg-card/92 px-4 py-2 backdrop-blur-sm dark:border-border/90 dark:bg-card/95">
					<div className="flex items-center justify-between">
						<h2 className="truncate pr-4 text-sm font-medium tracking-tight text-foreground">
							{t('configSidebar.documentInfo')}
						</h2>
						<button
							type="button"
							onClick={onOpenFolder}
							className={ICON_BUTTON_CLASS}
							aria-label={t('common.openFolder')}
							title={t('common.openFolder')}
						>
							<FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
						</button>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-2 space-y-6">
					{documentConfig && (
						<>
							<SettingRow label={t('configSidebar.documentTitle')}>
								<span className="text-sm font-medium text-foreground truncate max-w-[140px] block">
									{documentConfig.title}
								</span>
							</SettingRow>

							<SettingRow label={t('configSidebar.documentType')}>
								<div className="flex items-center gap-1.5">
									<Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
									<span className="text-sm text-foreground capitalize">{documentConfig.type}</span>
								</div>
							</SettingRow>

							{formattedDate && (
								<SettingRow label={t('configSidebar.updatedAt')}>
									<div className="flex items-center gap-1.5">
										<Calendar
											className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
											aria-hidden="true"
										/>
										<span className="text-sm text-foreground">{formattedDate}</span>
									</div>
								</SettingRow>
							)}

							<SettingRow label={t('configSidebar.textModel', 'Text Model')}>
								<div className="flex items-center gap-1.5">
									<PenLine
										className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
										aria-hidden="true"
									/>
									<span className="text-sm text-foreground truncate max-w-[140px] block">
										{textModelName}
									</span>
								</div>
							</SettingRow>

							<SettingRow label={t('configSidebar.imageModel', 'Image Model')}>
								<div className="flex items-center gap-1.5">
									<ImageIcon
										className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
										aria-hidden="true"
									/>
									<span className="text-sm text-foreground truncate max-w-[140px] block">
										{imageModelName}
									</span>
								</div>
							</SettingRow>
						</>
					)}

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

							<div className="flex items-center justify-between pt-6 pb-2">
								<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
									{t('configSidebar.images')}
									{images.length > 0 && (
										<span className="ml-1.5 text-[11px] text-muted-foreground/70">
											{images.length}
										</span>
									)}
								</h2>
								<button
									type="button"
									onClick={handleOpenImagesFolder}
									className={ICON_BUTTON_CLASS}
									aria-label={t('common.openFolder')}
									title={t('common.openFolder')}
								>
									<FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
								</button>
							</div>

							{images.length > 0 ? (
								<div className="grid grid-cols-4 gap-1.5">
									{images.map((img) => (
										<button
											type="button"
											key={img.fileName}
											className="group relative aspect-square overflow-hidden rounded-lg border border-border/70 bg-accent/45 cursor-pointer dark:bg-muted/40"
											onClick={() =>
												setPreviewImage({
													src: toLocalResourceUrl(img.filePath),
													alt: img.fileName,
												})
											}
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
										</button>
									))}
									<button
										type="button"
										onClick={handleUploadClick}
										className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border/80 bg-card/65 text-muted-foreground transition-colors hover:border-foreground/25 hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-background/40"
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
						</>
					)}

					{documentId && documentConfig && (
						<>
							<SectionHeader title={t('configSidebar.exportPdf')} />
							<PdfExportSection
								exportLabel={t('configSidebar.exportPdf')}
								downloadLabel={t('common.download')}
								previewLabel={t('common.preview')}
							/>
						</>
					)}

					{documentId && (
						<>
							<SectionHeader title={t('configSidebar.share')} />
							<div className="space-y-1">
								<button type="button" className={ACTION_BUTTON_CLASS}>
									<Link className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
									{t('configSidebar.shareLink')}
								</button>
							</div>
						</>
					)}

					{documentId && (
						<>
							<SectionHeader title={t('configSidebar.actions')} />
							<div className="space-y-1">
								<button type="button" className={ACTION_BUTTON_CLASS}>
									<Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
									{t('configSidebar.duplicate')}
								</button>
								<button
									type="button"
									onClick={() => setConfirmDeleteOpen(true)}
									disabled={isDeleting}
									className={`${ACTION_BUTTON_CLASS} hover:bg-destructive/10 hover:text-destructive`}
								>
									<Trash2
										className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
										aria-hidden="true"
									/>
									{t('configSidebar.deletePermanently')}
								</button>
							</div>
						</>
					)}
				</div>
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

			<ImagePreviewDialog
				open={previewImage !== null}
				onOpenChange={(open) => {
					if (!open) setPreviewImage(null);
				}}
				src={previewImage?.src ?? null}
				alt={previewImage?.alt ?? null}
			/>
		</>
	);
};

export default InfoPanel;
