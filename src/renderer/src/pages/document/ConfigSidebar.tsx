import { useMemo, useCallback } from 'react';
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
	ChevronDown,
} from 'lucide-react';
import { useDocumentState } from './hooks';
import {
	AppLabel,
	AppCard,
	AppCardHeader,
	AppCardTitle,
	AppCardContent,
	AppCardFooter,
	AppCollapsible,
	AppCollapsibleTrigger,
	AppCollapsiblePanel,
} from '@/components/app';

interface ConfigSidebarProps {
	readonly open: boolean;
	readonly animate?: boolean;
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

const ConfigSidebar: React.FC<ConfigSidebarProps> = ({ open, animate = true }) => {
	const { t, i18n } = useTranslation();
	const { documentId, metadata, images } = useDocumentState();

	const handleOpenFolder = useCallback(() => {
		if (!documentId) return;
		window.workspace.openDocumentFolder(documentId);
	}, [documentId]);

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
			className={`shrink-0 flex flex-col border-l border-border bg-muted/30 overflow-y-auto overflow-x-hidden ${animate ? 'transition-all duration-300 ease-in-out' : ''} ${open ? 'w-72' : 'w-0'}`}
		>
			<AppCard className="w-full flex flex-col flex-1 min-h-0 bg-transparent shadow-none border-none rounded-none">
				{/* Document Info */}
				{metadata && (
					<AppCardHeader className="p-4 pb-0">
						<AppCardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground/70">
							{t('configSidebar.documentInfo')}
							<button
								type="button"
								onClick={handleOpenFolder}
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

				<AppCardContent className="p-4 flex-1">
					{/* Images */}
					{documentId && (
						<>
							<div className="mb-2">
								<span className="text-xs font-medium text-muted-foreground/70">
									{t('configSidebar.images')}
								</span>
							</div>
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
								</div>
							) : (
								<div className="flex items-center gap-1.5 text-muted-foreground">
									<Image className="h-3.5 w-3.5 shrink-0" />
									<span className="text-xs">{t('configSidebar.noResources')}</span>
								</div>
							)}
						</>
					)}
				</AppCardContent>

				{/* Share & Export */}
				{documentId && (
					<AppCardFooter className="sticky bottom-0 flex-col items-stretch border-t border-border bg-muted p-0">
						<AppCollapsible>
							<AppCollapsibleTrigger className="justify-between px-4 py-3 text-xs font-medium text-muted-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors">
								{t('configSidebar.shareAndExport')}
								<ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 [[data-panel-open]_&]:rotate-180" />
							</AppCollapsibleTrigger>
							<AppCollapsiblePanel>
								<div className="space-y-1 px-4 pb-4">
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
									<button
										type="button"
										className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
									>
										<Link className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
										{t('configSidebar.shareLink')}
									</button>
								</div>
							</AppCollapsiblePanel>
						</AppCollapsible>
					</AppCardFooter>
				)}
			</AppCard>
		</div>
	);
};

export default ConfigSidebar;
