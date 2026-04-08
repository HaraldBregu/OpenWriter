import React from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus, Sparkles, X } from 'lucide-react';
import { AppButton } from '@components/app/AppButton';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';
const REFERENCE_HINTS = [
	['assistantNode.referenceHintComposition', 'Composition'],
	['assistantNode.referenceHintPalette', 'Palette'],
	['assistantNode.referenceHintLighting', 'Lighting'],
	['assistantNode.referenceHintMood', 'Mood'],
] as const;

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
	const handlePlaceholderKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
		if (disabled) return;
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onOpenFilePicker();
		}
	};

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
			<div className="border-b border-border/65 bg-muted/[0.24] px-4 py-3.5 dark:border-white/10 dark:bg-white/[0.03]">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="min-w-0 max-w-[30rem]">
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-xs font-semibold text-foreground">
								{t('assistantNode.referenceImages', 'Reference images')}
							</span>
							{files.length > 0 ? (
								<span className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:border-white/12 dark:bg-white/[0.04] dark:text-muted-foreground/95">
									{t('assistantNode.imageCount', '{{count}} ready', { count: files.length })}
								</span>
							) : null}
						</div>
						<p className="mt-1 text-[11px] leading-5 text-muted-foreground dark:text-muted-foreground/95">
							{files.length > 0
								? t(
										'assistantNode.referenceImagesHelp',
										'Add more references or drag more images into the composer to refine the result.'
									)
								: t(
										'assistantNode.referenceImagesEmpty',
										'Reference images help guide framing, palette, lighting, and overall mood.'
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
					<div className="mt-3 flex items-stretch gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
						{previewUrls.map((url, index) => (
							<div
								key={`${files[index]?.name ?? 'image'}-${index}`}
								className="group/thumb relative w-[6.4rem] shrink-0"
							>
								<div className="overflow-hidden rounded-[1.25rem] border border-border/75 bg-background/82 shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_6px_16px_hsl(var(--foreground)/0.05)] dark:border-white/12 dark:bg-white/[0.03] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_8px_18px_hsl(var(--background)/0.32)]">
									<div className="h-[5.25rem] w-full overflow-hidden bg-muted/30 dark:bg-white/[0.04]">
										<img
											src={url}
											alt={files[index]?.name ?? ''}
											className="h-full w-full object-cover"
										/>
									</div>
									<div className="border-t border-border/60 bg-background/88 px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.03]">
										<p
											className="truncate text-[10px] font-medium text-foreground/85 dark:text-foreground/88"
											title={files[index]?.name ?? ''}
										>
											{files[index]?.name ?? t('assistantNode.referenceImages', 'Reference images')}
										</p>
									</div>
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
						<AppButton
							variant="ghost"
							size="sm"
							className="h-auto min-h-[7.65rem] min-w-[5.75rem] shrink-0 rounded-[1.25rem] border border-dashed border-border/80 bg-background/62 px-3 text-[11px] font-semibold text-muted-foreground shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_4px_10px_hsl(var(--foreground)/0.04)] hover:border-foreground/18 hover:bg-background hover:text-foreground dark:border-white/14 dark:bg-white/[0.03] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_6px_14px_hsl(var(--background)/0.26)] dark:hover:border-white/18 dark:hover:bg-white/[0.05]"
							disabled={disabled}
							onMouseDown={(e) => e.preventDefault()}
							onClick={onOpenFilePicker}
						>
							<span className="flex flex-col items-center gap-1.5">
								<ImagePlus className="h-4 w-4" />
								<span>{t('assistantNode.addImage', 'Add image')}</span>
							</span>
						</AppButton>
					</div>
				) : (
					<div
						className={`mt-3 overflow-hidden rounded-[1.5rem] border border-dashed transition-[border-color,background-color,box-shadow] ${
							isDragOver
								? 'border-primary/50 bg-[linear-gradient(180deg,hsl(var(--primary)/0.12)_0%,hsl(var(--background)/0.7)_100%)] shadow-[0_0_0_0.5px_hsl(var(--primary)/0.16),0_12px_24px_hsl(var(--primary)/0.12)] dark:bg-[linear-gradient(180deg,hsl(var(--primary)/0.18)_0%,hsl(var(--background)/0.16)_100%)]'
								: 'border-border/75 bg-[linear-gradient(180deg,hsl(var(--background)/0.72)_0%,hsl(var(--muted)/0.42)_100%)] dark:border-white/12 dark:bg-[linear-gradient(180deg,hsl(var(--background)/0.18)_0%,hsl(var(--muted)/0.18)_100%)]'
						}`}
					>
						<div
							role={disabled ? undefined : 'button'}
							tabIndex={disabled ? -1 : 0}
							onMouseDown={(e) => e.preventDefault()}
							onClick={disabled ? undefined : onOpenFilePicker}
							onKeyDown={handlePlaceholderKeyDown}
							aria-label={t('assistantNode.browseReferenceImages', 'Browse reference images')}
							className="relative flex min-h-[9.4rem] items-center justify-center px-5 py-5 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
						>
							<div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-foreground/12 to-transparent dark:via-white/14" />
							<div className="flex max-w-[28rem] flex-col items-center gap-3">
								<div className="relative flex h-12 w-12 items-center justify-center rounded-[1.35rem] border border-border/70 bg-background/85 text-muted-foreground shadow-[0_1px_0_hsl(var(--background)/0.95)_inset,0_8px_18px_hsl(var(--foreground)/0.05)] dark:border-white/12 dark:bg-white/[0.05] dark:text-muted-foreground/95 dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_10px_20px_hsl(var(--background)/0.34)]">
									<ImagePlus className="h-[18px] w-[18px]" />
									<span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-border/70 bg-background text-primary shadow-sm dark:border-white/12 dark:bg-background">
										<Sparkles className="h-3 w-3" />
									</span>
								</div>
								<div className="space-y-1">
									<p className="text-sm font-semibold text-foreground">
										{t('assistantNode.dropImagesTitle', 'Drop images or browse')}
									</p>
									<p className="text-[11px] leading-5 text-muted-foreground dark:text-muted-foreground/95">
										{t(
											'assistantNode.dropImagesDescription',
											'Reference images help the model match framing, colors, lighting, and mood while your prompt stays in control.'
										)}
									</p>
								</div>
								<div className="flex flex-wrap justify-center gap-1.5">
									{REFERENCE_HINTS.map(([key, fallback]) => (
										<span
											key={key}
											className="rounded-full border border-border/70 bg-background/82 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground dark:border-white/12 dark:bg-white/[0.04] dark:text-muted-foreground/95"
										>
											{t(key, fallback)}
										</span>
									))}
								</div>
								<p className="text-[10px] font-medium text-muted-foreground/88 dark:text-muted-foreground/88">
									{t(
										'assistantNode.supportedFormats',
										'Supports PNG, JPG, WEBP, GIF, SVG, and AVIF'
									)}
								</p>
							</div>
						</div>
					</div>
				)}
			</div>
		</>
	);
}
