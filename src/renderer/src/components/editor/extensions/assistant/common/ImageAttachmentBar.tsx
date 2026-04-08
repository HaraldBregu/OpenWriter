import React from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus, X } from 'lucide-react';
import { AppButton } from '@components/app/AppButton';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';

interface ImageAttachmentBarProps {
	files: File[];
	previewUrls: string[];
	disabled: boolean;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	onOpenFilePicker: () => void;
	onRemoveFile: (index: number) => void;
	onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ImageAttachmentBar({
	files,
	previewUrls,
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
			<div className="border-b border-border/65 bg-muted/[0.28] px-3.5 pb-2 dark:border-white/10 dark:bg-white/[0.03]">
				<div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1">
					<AppButton
						variant="ghost"
						size="sm"
						className="h-16 shrink-0 rounded-[1.15rem] border border-dashed border-border/80 bg-background/76 px-3 text-xs font-medium text-muted-foreground shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_4px_10px_hsl(var(--foreground)/0.04)] hover:border-foreground/18 hover:bg-background hover:text-foreground dark:border-white/14 dark:bg-white/[0.03] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_6px_14px_hsl(var(--background)/0.26)] dark:hover:border-white/18 dark:hover:bg-white/[0.05]"
						disabled={disabled}
						onMouseDown={(e) => {
							e.preventDefault();
							onOpenFilePicker();
						}}
					>
						<div className="flex flex-col items-center gap-1">
							<ImagePlus className="h-4 w-4" />
							<span>{t('assistantNode.addImage', 'Add image')}</span>
						</div>
					</AppButton>
					{previewUrls.map((url, index) => (
						<div
							key={`${files[index]?.name ?? 'image'}-${index}`}
							className="group/thumb relative h-16 w-16 shrink-0"
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
								className="absolute -right-1.5 -top-1.5 z-10 h-5 w-5 rounded-full border border-border/70 bg-background text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover/thumb:opacity-100 hover:bg-background hover:text-foreground dark:border-white/12 dark:bg-background"
								onMouseDown={(e) => {
									e.preventDefault();
									onRemoveFile(index);
								}}
								aria-label={t('assistantNode.removeImage', 'Remove image')}
							>
								<X className="h-3 w-3" />
							</AppButton>
						</div>
					))}
				</div>
			</div>
		</>
	);
}
