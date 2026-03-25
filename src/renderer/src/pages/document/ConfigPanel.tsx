import { useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
	FileText,
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
import { useDocumentState, useDocumentDispatch } from './hooks';
import {
	AppLabel,
	AppCard,
	AppCardHeader,
	AppCardTitle,
	AppCardContent,
} from '@/components/app';

interface ConfigPanelProps {
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

const ConfigPanel: React.FC<ConfigPanelProps> = ({ open, onOpenFolder }) => {
	const { t, i18n } = useTranslation();
	const { toggleSidebar } = useSidebarVisibility();
	const { documentId, metadata, images } = useDocumentState();
	const dispatch = useDocumentDispatch();
	const fileInputRef = useRef<HTMLInputElement>(null);

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
						const fileName = `image-${Date.now()}.${ext}`;
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

			// Reset input so the same file can be re-selected
			e.target.value = '';

			// Refresh images list
			try {
				const updated = await window.workspace.listDocumentImages(documentId);
				dispatch({ type: 'IMAGES_UPDATED', images: updated });
			} catch {
				/* file watcher will pick it up */
			}
		},
		[documentId, dispatch]
	);

	const formattedCreatedAt = useMemo(
		() => (metadata?.createdAt ? formatDate(metadata.createdAt, i18n.language) : null),
		[metadata?.createdAt, i18n.language]
	);

	const formattedUpdatedAt = useMemo(
		() => (metadata?.updatedAt ? formatDate(metadata.updatedAt, i18n.language) : null),
		[metadata?.updatedAt, i18n.language]
	);

	if (!open) {
		return (
			<div className="flex h-full w-12 shrink-0 flex-col items-center border-l border-border bg-muted/30 pt-2">
				<AppButton
					type="button"
					variant="ghost"
					size="icon"
					aria-label={t('configSidebar.documentInfo')}
					title={t('configSidebar.documentInfo')}
					className="h-8 w-8 text-muted-foreground hover:text-foreground"
					onClick={() => toggleSidebar('config')}
				>
					<Info className="h-4 w-4" aria-hidden="true" />
				</AppButton>
			</div>
		);
	}

	return (
		<div className="flex flex-col border-l border-border bg-muted/30 overflow-y-auto overflow-x-hidden w-full">
			<AppCard className="w-full flex flex-col flex-1 min-h-0 bg-transparent shadow-none border-none rounded-none">
				{/* Document Info */}
				{metadata && (
					<AppCardHeader className="p-4 pb-0">
						<AppCardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground/70">
							{t('configSidebar.documentInfo')}
							<button
								type="button"
								onClick={onOpenFolder}
								className="p-1 rounded text-muted-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
								aria-label={t('common.openFolder')}
								title={t('common.openFolder')}
							>
								<FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
							</button>
						</AppCardTitle>
						<div className="space-y-3 pt-2">
							<div className="space-y-1">
								<AppLabel className="text-xs text-muted-foreground">
									{t('configSidebar.documentTitle')}
								</AppLabel>
								<div className="flex items-center gap-1.5">
									<FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									<span className="text-sm text-foreground truncate">{metadata.title || '—'}</span>
								</div>
							</div>
							<div className="space-y-1">
								<AppLabel className="text-xs text-muted-foreground">
									{t('configSidebar.documentType')}
								</AppLabel>
								<div className="flex items-center gap-1.5">
									<Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									<span className="text-sm text-foreground capitalize">{metadata.type}</span>
								</div>
							</div>
							{formattedCreatedAt && (
								<div className="space-y-1">
									<AppLabel className="text-xs text-muted-foreground">
										{t('configSidebar.createdAt')}
									</AppLabel>
									<div className="flex items-center gap-1.5">
										<Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
										<span className="text-sm text-foreground">{formattedCreatedAt}</span>
									</div>
								</div>
							)}
							{formattedUpdatedAt && (
								<div className="space-y-1">
									<AppLabel className="text-xs text-muted-foreground">
										{t('configSidebar.updatedAt')}
									</AppLabel>
									<div className="flex items-center gap-1.5">
										<Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
										<span className="text-sm text-foreground">{formattedUpdatedAt}</span>
									</div>
								</div>
							)}
						</div>
					</AppCardHeader>
				)}

				<AppCardContent className="p-4 flex-1 space-y-4">
					{/* Images */}
					{documentId && (
						<>
							<div className="mb-2">
								<span className="text-xs font-medium text-muted-foreground/70">
									{t('configSidebar.images')}
								</span>
							</div>
							<input
								ref={fileInputRef}
								type="file"
								accept={ACCEPTED_IMAGE_TYPES}
								multiple
								className="hidden"
								onChange={handleFileChange}
							/>
							{images.length > 0 ? (
								<div className="grid grid-cols-4 gap-2">
									{images.map((img) => (
										<div
											key={img.fileName}
											className="group relative aspect-square rounded-md overflow-hidden border border-border bg-muted/50"
										>
											<img
												src={toLocalResourceUrl(img.filePath)}
												alt={img.fileName}
												className="h-full w-full object-cover"
												loading="lazy"
											/>
											<div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
												<span className="text-[10px] text-white truncate block">
													{img.fileName}
												</span>
											</div>
										</div>
									))}
									<button
										type="button"
										onClick={handleUploadClick}
										className="aspect-square rounded-md border border-dashed border-border bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
									className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									aria-label={t('configSidebar.uploadImage')}
								>
									<Image className="h-4 w-4 shrink-0" />
									<span className="text-xs">{t('configSidebar.uploadImage')}</span>
								</button>
							)}
						</>
					)}

					{/* Export */}
					{documentId && (
						<div>
							<div className="mb-2">
								<span className="text-xs font-medium text-muted-foreground/70">
									{t('configSidebar.export')}
								</span>
							</div>
							<div className="space-y-1">
								<button
									type="button"
									className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
								>
									<FileDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									{t('configSidebar.exportPdf')}
								</button>
								<button
									type="button"
									className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
								>
									<FileType className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									{t('configSidebar.exportMd')}
								</button>
							</div>
						</div>
					)}

					{/* Share */}
					{documentId && (
						<div>
							<div className="mb-2">
								<span className="text-xs font-medium text-muted-foreground/70">
									{t('configSidebar.share')}
								</span>
							</div>
							<div className="space-y-1">
								<button
									type="button"
									className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
								>
									<Link className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									{t('configSidebar.shareLink')}
								</button>
							</div>
						</div>
					)}

					{/* Actions */}
					{documentId && (
						<div>
							<div className="mb-2">
								<span className="text-xs font-medium text-muted-foreground/70">
									{t('configSidebar.actions')}
								</span>
							</div>
							<div className="space-y-1">
								<button
									type="button"
									className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
								>
									<Copy className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									{t('configSidebar.duplicate')}
								</button>
								<button
									type="button"
									className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
								>
									<Trash2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									{t('configSidebar.deletePermanently')}
								</button>
							</div>
						</div>
					)}
				</AppCardContent>
			</AppCard>
		</div>
	);
};

export default ConfigPanel;
