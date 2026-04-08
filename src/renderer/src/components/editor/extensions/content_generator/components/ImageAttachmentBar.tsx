import React from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus, X } from 'lucide-react';
import { AppButton } from '@components/app/AppButton';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';

interface ImageAttachmentBarProps {
	files: File[];
	previewUrls: string[];
	isDragOver: boolean;
	disabled: boolean;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	onOpenFilePicker: () => void;
	onRemoveFile: (index: number) => void;
	onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ImageAttachmentBar({
	files,
	previewUrls,
	isDragOver,
	disabled,
	fileInputRef,
	onOpenFilePicker,
	onRemoveFile,
	onFileInputChange,
}: ImageAttachmentBarProps): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<>
			<input
				ref={fileInputRef}
				type="file"
				accept={ACCEPTED_IMAGE_TYPES}
				className="hidden"
				onChange={onFileInputChange}
				aria-hidden="true"
				tabIndex={-1}
				multiple
			/>
			<div className="border-b border-border/65 bg-muted/[0.24] px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-xs font-semibold text-foreground">
								{t('assistantNode.referenceImages', 'Reference images')}
							</span>
							{files.length > 0 ? (
								<span className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:border-white/12 dark:bg-white/[0.04] dark:text-muted-foreground/95">
									{t('assistantNode.imageCount', '{{count}} attached', { count: files.length })}
								</span>
							) : null}
						</div>
						<p className="mt-1 text-[11px] leading-5 text-muted-foreground dark:text-muted-foreground/95">
							{previewUrls.length > 0
								? t(
										'assistantNode.referenceImagesHelp',
										'Add more images or drag files into the composer to guide the result.'
									)
								: t(
										'assistantNode.referenceImagesEmpty',
										'Drop images here or browse to give the generator visual references.'
									)}
						</p>
					</div>
					<AppButton
						variant="ghost"
						size="sm"
						className="h-9 shrink-0 rounded-full border border-dashed border-border/80 bg-background/76 px-3 text-xs font-semibold text-muted-foreground shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_4px_10px_hsl(var(--foreground)/0.04)] hover:border-foreground/18 hover:bg-background hover:text-foreground dark:border-white/14 dark:bg-white/[0.03] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_6px_14px_hsl(var(--background)/0.26)] dark:hover:border-white/18 dark:hover:bg-white/[0.05]"
						disabled={disabled}
						onMouseDown={(e) => e.preventDefault()}
						onClick={onOpenFilePicker}
					>
						<ImagePlus className="h-4 w-4" />
						<span>{t('assistantNode.addImage', 'Add image')}</span>
					</AppButton>
				</div>
				{previewUrls.length > 0 ? (
					<div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
						{previewUrls.map((url, index) => (
							<div
								key={`${files[index]?.name ?? 'image'}-${index}`}
								className="group/thumb relative h-20 w-20 shrink-0"
							>
								<div className="h-full w-full overflow-hidden rounded-[1.15rem] border border-border/75 bg-background/82 shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_6px_16px_hsl(var(--foreground)/0.05)] dark:border-white/12 dark:bg-white/[0.03] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_8px_18px_hsl(var(--background)/0.32)]">
									<img
										src={url}
										alt={files[index]?.name ?? ''}
										className="h-full w-full object-cover"
									/>
								</div>
								<AppButton
									variant="ghost"
									size="icon-xs"
									className="absolute -right-1.5 -top-1.5 z-10 h-6 w-6 rounded-full border border-border/70 bg-background text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover/thumb:opacity-100 group-focus-within/thumb:opacity-100 hover:bg-background hover:text-foreground dark:border-white/12 dark:bg-background"
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => onRemoveFile(index)}
									aria-label={t('assistantNode.removeImage', 'Remove image')}
								>
									<X className="h-3 w-3" />
								</AppButton>
							</div>
						))}
					</div>
				) : (
					<div
						className={`mt-3 flex min-h-[7.25rem] items-center justify-center rounded-[1.35rem] border border-dashed px-4 text-center transition-colors ${
							isDragOver
								? 'border-primary/45 bg-primary/10'
								: 'border-border/75 bg-background/56 dark:border-white/12 dark:bg-white/[0.03]'
						}`}
					>
						<div className="flex max-w-[18rem] flex-col items-center gap-1.5">
							<div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-background/80 text-muted-foreground dark:border-white/12 dark:bg-white/[0.04] dark:text-muted-foreground/95">
								<ImagePlus className="h-4 w-4" />
							</div>
							<p className="text-xs font-semibold text-foreground">
								{t('assistantNode.dropImagesTitle', 'Drop reference images')}
							</p>
							<p className="text-[11px] leading-5 text-muted-foreground dark:text-muted-foreground/95">
								{t(
									'assistantNode.dropImagesDescription',
									'Use references for composition, palette, or mood. You can still send a prompt without attachments.'
								)}
							</p>
						</div>
					</div>
				)}
			</div>
		</>
	);
}
