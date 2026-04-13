import React from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/Empty';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';

interface AttachmentProps {
	files: File[];
	previewUrls: string[];
	isDragOver: boolean;
	disabled: boolean;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	onOpenFilePicker: () => void;
	onRemoveFile: (index: number) => void;
	onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Attachment({
	files,
	previewUrls,
	isDragOver,
	disabled,
	fileInputRef,
	onOpenFilePicker,
	onRemoveFile,
	onFileInputChange,
}: AttachmentProps): React.JSX.Element {
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
			<div className="">
				{previewUrls.length > 0 ? (
					<div className="mt-3 flex items-stretch gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
						{previewUrls.map((url, index) => (
							<div
								key={`${files[index]?.name ?? 'image'}-${index}`}
								className="group/thumb relative w-[5.5rem] shrink-0"
							>
								<div className="overflow-hidden rounded-[1.25rem] border border-border/75 bg-background/82 shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_6px_16px_hsl(var(--foreground)/0.05)] dark:border-white/12 dark:bg-white/[0.03] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_8px_18px_hsl(var(--background)/0.32)]">
									<div className="h-[4.5rem] w-full overflow-hidden bg-muted/30 dark:bg-white/[0.04]">
										<img
											src={url}
											alt={files[index]?.name ?? ''}
											className="h-full w-full object-cover"
										/>
									</div>
									<div className="border-t border-border/60 bg-background/88 px-2 py-1.5 dark:border-white/10 dark:bg-white/[0.03]">
										<span
											className="truncate text-[10px] font-medium text-foreground/85 dark:text-foreground/88"
											title={files[index]?.name ?? ''}
										>
											{files[index]?.name ?? t('assistantNode.referenceImages', 'Reference images')}
										</span>
									</div>
								</div>
								<Button
									variant="ghost"
									size="icon-xs"
									className="absolute -right-1.5 -top-1.5 z-10 h-6 w-6 rounded-full border border-border/70 bg-background text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover/thumb:opacity-100 group-focus-within/thumb:opacity-100 hover:bg-background hover:text-foreground dark:border-white/12 dark:bg-background"
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => onRemoveFile(index)}
									aria-label={t('assistantNode.removeImage', 'Remove image')}
								>
									<X className="h-3 w-3" />
								</Button>
							</div>
						))}
						<Button
							variant="ghost"
							size="sm"
							className="h-auto min-h-[6.5rem] min-w-[5rem] shrink-0 rounded-[1.25rem] border border-dashed border-border/80 bg-background/62 px-3 text-[11px] font-semibold text-muted-foreground shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_4px_10px_hsl(var(--foreground)/0.04)] hover:border-foreground/18 hover:bg-background hover:text-foreground dark:border-white/14 dark:bg-white/[0.03] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_6px_14px_hsl(var(--background)/0.26)] dark:hover:border-white/18 dark:hover:bg-white/[0.05]"
							disabled={disabled}
							onMouseDown={(e) => e.preventDefault()}
							onClick={onOpenFilePicker}
						>
							<span className="flex flex-col items-center gap-1.5">
								<ImagePlus className="h-4 w-4" />
								<span>{t('assistantNode.addImage', 'Add image')}</span>
							</span>
						</Button>
					</div>
				) : (
					<Empty
						className={`overflow-hidden rounded-3xl border transition-[border-color,background-color,box-shadow] ${
							isDragOver
								? 'border-primary/50 bg-[linear-gradient(180deg,hsl(var(--primary)/0.12)_0%,hsl(var(--background)/0.7)_100%)] shadow-[0_0_0_0.5px_hsl(var(--primary)/0.16),0_12px_24px_hsl(var(--primary)/0.12)] dark:bg-[linear-gradient(180deg,hsl(var(--primary)/0.18)_0%,hsl(var(--background)/0.16)_100%)]'
								: 'border-border/75 bg-[linear-gradient(180deg,hsl(var(--background)/0.72)_0%,hsl(var(--muted)/0.42)_100%)] dark:border-white/12 dark:bg-[linear-gradient(180deg,hsl(var(--background)/0.18)_0%,hsl(var(--muted)/0.18)_100%)]'
						}`}
						role={disabled ? undefined : 'button'}
						tabIndex={disabled ? -1 : 0}
						onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
						onClick={disabled ? undefined : onOpenFilePicker}
						onKeyDown={handlePlaceholderKeyDown}
						aria-label={t('assistantNode.browseReferenceImages', 'Browse reference images')}
					>
						<EmptyHeader className="min-h-28 justify-center px-4 py-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0">
							<EmptyMedia variant="icon" className="size-9 rounded-2xl border border-border/70 bg-background/85 text-muted-foreground shadow-[0_1px_0_hsl(var(--background)/0.95)_inset,0_6px_14px_hsl(var(--foreground)/0.05)] dark:border-white/12 dark:bg-white/5 dark:text-muted-foreground/95 dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_8px_16px_hsl(var(--background)/0.34)]">
								<ImagePlus className="h-4 w-4" />
							</EmptyMedia>
							<EmptyTitle className="text-xs font-semibold">
								{t('assistantNode.dropImagesTitle', 'Drop images or browse')}
							</EmptyTitle>
							<EmptyDescription className="text-[11px] leading-4 dark:text-muted-foreground/95">
								{t('assistantNode.dropImagesDescription', 'Optional references for style or mood.')}
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}
			</div>
		</>
	);
}
