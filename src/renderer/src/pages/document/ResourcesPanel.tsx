import { useMemo, useCallback, useRef } from 'react';
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
	type LucideIcon,
} from 'lucide-react';
import { useDocumentState, useDocumentDispatch } from './hooks';
import { cn } from '@/lib/utils';

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

interface ResourceSectionProps {
	readonly title: string;
	readonly action?: React.ReactNode;
	readonly children: React.ReactNode;
}

interface ResourceInfoCardProps {
	readonly icon: LucideIcon;
	readonly label: string;
	readonly value: string;
	readonly valueClassName?: string;
}

interface ResourceActionButtonProps {
	readonly icon: LucideIcon;
	readonly label: string;
	readonly danger?: boolean;
}

const ResourceSection: React.FC<ResourceSectionProps> = ({ title, action, children }) => (
	<section className="rounded-[1.35rem] border border-border/70 bg-card/85 p-3 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.5)] backdrop-blur">
		<div className="mb-3 flex items-center justify-between gap-3">
			<h2 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/70">
				{title}
			</h2>
			{action}
		</div>
		{children}
	</section>
);

const ResourceInfoCard: React.FC<ResourceInfoCardProps> = ({ icon: Icon, label, value, valueClassName }) => (
	<div className="rounded-2xl border border-border/60 bg-background/75 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
		<div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
			{label}
		</div>
		<div className="mt-2 flex items-center gap-2.5">
			<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
				<Icon className="h-4 w-4" aria-hidden="true" />
			</div>
			<span className={cn('text-sm font-medium text-foreground', valueClassName)}>{value}</span>
		</div>
	</div>
);

const ResourceActionButton: React.FC<ResourceActionButtonProps> = ({
	icon: Icon,
	label,
	danger = false,
}) => (
	<button
		type="button"
		className={cn(
			'group flex w-full items-center gap-3 rounded-xl border border-transparent bg-background/75 px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
			'hover:border-border/70 hover:bg-muted/45',
			danger && 'hover:border-destructive/25 hover:bg-destructive/5'
		)}
	>
		<div
			className={cn(
				'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/70 text-muted-foreground transition-colors group-hover:text-foreground',
				danger && 'group-hover:border-destructive/20 group-hover:bg-destructive/10 group-hover:text-destructive'
			)}
		>
			<Icon className="h-4 w-4" aria-hidden="true" />
		</div>
		<span className={cn('text-sm font-medium text-foreground', danger && 'group-hover:text-destructive')}>
			{label}
		</span>
	</button>
);

const ResourcesPanel: React.FC<ResourcesPanelProps> = ({ onOpenFolder }) => {
	const { t, i18n } = useTranslation();
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

	return (
		<div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden border-l border-border bg-gradient-to-b from-background via-muted/25 to-background">
			<div className="flex flex-1 flex-col gap-4 p-4">
				{metadata && (
					<section className="rounded-[1.5rem] border border-border/70 bg-gradient-to-br from-card via-card to-muted/55 p-4 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.55)]">
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground/70">
									{t('configSidebar.documentInfo')}
								</p>
								<h1 className="mt-2 line-clamp-2 text-base font-semibold leading-tight text-foreground">
									{metadata.title}
								</h1>
							</div>
							<button
								type="button"
								onClick={onOpenFolder}
								className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								aria-label={t('common.openFolder')}
								title={t('common.openFolder')}
							>
								<FolderOpen className="h-4 w-4" aria-hidden="true" />
							</button>
						</div>

						<div className="mt-4 grid gap-2">
							<ResourceInfoCard
								icon={Tag}
								label={t('configSidebar.documentType')}
								value={metadata.type}
								valueClassName="capitalize"
							/>
							{formattedDate && (
								<ResourceInfoCard
									icon={Calendar}
									label={t('configSidebar.updatedAt')}
									value={formattedDate}
								/>
							)}
							{documentId && (
								<ResourceInfoCard
									icon={Image}
									label={t('configSidebar.images')}
									value={String(images.length)}
								/>
							)}
						</div>
					</section>
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

						<ResourceSection
							title={t('configSidebar.images')}
							action={
								<button
									type="button"
									onClick={handleUploadClick}
									className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									aria-label={t('configSidebar.uploadImage')}
									title={t('configSidebar.uploadImage')}
								>
									<Plus className="h-3.5 w-3.5" aria-hidden="true" />
									{t('configSidebar.uploadImage')}
								</button>
							}
						>
							{images.length > 0 ? (
								<div className="grid grid-cols-2 gap-3">
									{images.map((img) => (
										<div
											key={img.fileName}
											className="group relative aspect-square overflow-hidden rounded-[1.05rem] border border-border/70 bg-muted/35"
										>
											<img
												src={toLocalResourceUrl(img.filePath)}
												alt={img.fileName}
												className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
												loading="lazy"
											/>
											<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-2.5 pb-2 pt-8">
												<span className="block truncate text-[11px] font-medium text-white">
													{img.fileName}
												</span>
											</div>
										</div>
									))}
									<button
										type="button"
										onClick={handleUploadClick}
										className="group flex aspect-square flex-col items-center justify-center gap-3 rounded-[1.05rem] border border-dashed border-border/80 bg-gradient-to-br from-background/85 to-muted/45 px-3 text-center text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										aria-label={t('configSidebar.uploadImage')}
										title={t('configSidebar.uploadImage')}
									>
										<div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/85 shadow-sm">
											<Plus className="h-4 w-4" aria-hidden="true" />
										</div>
										<span className="text-xs font-medium">{t('configSidebar.uploadImage')}</span>
									</button>
								</div>
							) : (
								<button
									type="button"
									onClick={handleUploadClick}
									className="flex w-full flex-col items-center justify-center gap-3 rounded-[1.2rem] border border-dashed border-border/80 bg-gradient-to-br from-background/85 to-muted/45 px-4 py-8 text-center transition-colors hover:border-foreground/20 hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									aria-label={t('configSidebar.uploadImage')}
								>
									<div className="flex h-12 w-12 items-center justify-center rounded-full bg-background/85 shadow-sm">
										<Image className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
									</div>
									<div className="space-y-1">
										<p className="text-sm font-medium text-foreground">{t('configSidebar.noImages')}</p>
										<p className="text-xs text-muted-foreground">
											{t('configSidebar.uploadImage')}
										</p>
									</div>
								</button>
							)}
						</ResourceSection>

						<ResourceSection title={t('configSidebar.export')}>
							<div className="space-y-2">
								<ResourceActionButton icon={FileDown} label={t('configSidebar.exportPdf')} />
								<ResourceActionButton icon={FileType} label={t('configSidebar.exportMd')} />
							</div>
						</ResourceSection>

						<ResourceSection title={t('configSidebar.share')}>
							<div className="space-y-2">
								<ResourceActionButton icon={Link} label={t('configSidebar.shareLink')} />
							</div>
						</ResourceSection>

						<ResourceSection title={t('configSidebar.actions')}>
							<div className="space-y-2">
								<ResourceActionButton icon={Copy} label={t('configSidebar.duplicate')} />
								<ResourceActionButton
									icon={Trash2}
									label={t('configSidebar.deletePermanently')}
									danger
								/>
							</div>
						</ResourceSection>
					</>
				)}
			</div>
		</div>
	);
};

export default ResourcesPanel;
