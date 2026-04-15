import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Image, Plus } from 'lucide-react';
import { useDocumentState } from '../../../hooks';
import { useImageUpload } from '../hooks/use-image-upload';
import { useInfoDispatch } from '../hooks/use-info-dispatch';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';

const ICON_BUTTON_CLASS =
	'rounded-full p-1 text-muted-foreground/70 transition-colors hover:bg-accent/75 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function toLocalResourceUrl(filePath: string): string {
	const normalized = filePath.replace(/\\/g, '/');
	const urlPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
	return `local-resource://localhost${urlPath}`;
}

export function ImagesSection(): React.ReactElement | null {
	const { t } = useTranslation();
	const { documentId, images } = useDocumentState();
	const dispatch = useInfoDispatch();
	const { fileInputRef, handleUploadClick, handleFileChange } = useImageUpload();

	const handleOpenImagesFolder = useCallback(() => {
		if (!documentId) return;
		window.workspace.openDocumentImagesFolder(documentId);
	}, [documentId]);

	if (!documentId) return null;

	return (
		<div className="mt-4">
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
						<span className="ml-1.5 text-[11px] text-muted-foreground/70">{images.length}</span>
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
				<div className="flex flex-wrap gap-1">
					{images.map((img) => (
						<button
							type="button"
							key={img.fileName}
							className="group relative h-[60px] w-[60px] overflow-hidden rounded-md border border-border/70 bg-accent/45 cursor-pointer dark:bg-muted/40"
							onClick={() =>
								dispatch({
									type: 'IMAGE_PREVIEW_OPENED',
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
							<div className="absolute inset-x-0 bottom-0 bg-black/55 px-0.5 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
								<span className="block truncate text-[8px] text-white">{img.fileName}</span>
							</div>
						</button>
					))}
					<button
						type="button"
						onClick={handleUploadClick}
						className="flex h-[60px] w-[60px] items-center justify-center rounded-md border border-dashed border-border/80 bg-card/65 text-muted-foreground transition-colors hover:border-foreground/25 hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-background/40"
						aria-label={t('configSidebar.uploadImage')}
						title={t('configSidebar.uploadImage')}
					>
						<Plus className="h-3.5 w-3.5" />
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
	);
}
