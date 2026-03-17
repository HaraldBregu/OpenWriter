import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Calendar, Tag, Image, FolderOpen, FileDown, FileType, Link } from 'lucide-react';
import type { OutputFileMetadata, DocumentImageInfo } from '../../../../shared/types';
import { AppLabel, AppSeparator } from '@/components/app';

interface ConfigSidebarProps {
	readonly open: boolean;
	readonly documentId: string | undefined;
	readonly metadata: OutputFileMetadata | null;
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

function toLocalResourceUrl(filePath: string): string {
	const normalized = filePath.replace(/\\/g, '/');
	const urlPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
	return `local-resource://localhost${urlPath}`;
}

const ConfigSidebar: React.FC<ConfigSidebarProps> = ({
	open,
	documentId,
	metadata,
	onOpenFolder,
}) => {
	const { t, i18n } = useTranslation();
	const [images, setImages] = useState<DocumentImageInfo[]>([]);

	const loadImages = useCallback(async () => {
		if (!documentId) {
			setImages([]);
			return;
		}
		try {
			const result = await window.workspace.listDocumentImages(documentId);
			setImages(result);
		} catch {
			setImages([]);
		}
	}, [documentId]);

	useEffect(() => {
		loadImages();
	}, [loadImages]);

	useEffect(() => {
		if (!documentId) return;

		const unsubscribe = window.workspace.onOutputFileChange((event) => {
			if (event.outputType !== 'documents' || event.fileId !== documentId) return;
			if (event.type === 'changed' || event.type === 'added') {
				loadImages();
			}
		});

		return unsubscribe;
	}, [documentId, loadImages]);

	const formattedCreatedAt = useMemo(
		() => (metadata?.createdAt ? formatDate(metadata.createdAt, i18n.language) : null),
		[metadata?.createdAt, i18n.language]
	);

	const formattedUpdatedAt = useMemo(
		() => (metadata?.updatedAt ? formatDate(metadata.updatedAt, i18n.language) : null),
		[metadata?.updatedAt, i18n.language]
	);

	return (
		<div
			className={`shrink-0 border-l border-border bg-muted/30 overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out ${open ? 'w-72' : 'w-0'}`}
		>
			<div className="w-72 p-4">
				{/* Document Info */}
				{metadata && (
					<>
						<div className="mb-1 flex items-center justify-between">
							<span className="text-xs font-medium text-muted-foreground/70">
								{t('configSidebar.documentInfo')}
							</span>
							<button
								type="button"
								onClick={onOpenFolder}
								className="text-muted-foreground/70 hover:text-foreground transition-colors"
								title={t('common.openFolder')}
							>
								<FolderOpen className="h-3.5 w-3.5" />
							</button>
						</div>
						<div className="space-y-3">
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

						<AppSeparator className="my-4" />
					</>
				)}

				{/* Resources */}
				{documentId && (
					<>
						<div className="mb-2">
							<span className="text-xs font-medium text-muted-foreground/70">
								{t('configSidebar.resources')}
							</span>
						</div>
						{images.length > 0 ? (
							<div className="grid grid-cols-3 gap-2">
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
											<span className="text-[10px] text-white truncate block">{img.fileName}</span>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="flex items-center gap-1.5 text-muted-foreground">
								<Image className="h-3.5 w-3.5 shrink-0" />
								<span className="text-xs">{t('configSidebar.noResources')}</span>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
};

export default ConfigSidebar;
