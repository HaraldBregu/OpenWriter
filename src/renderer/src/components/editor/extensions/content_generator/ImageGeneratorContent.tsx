import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppTextarea } from '@components/app/AppTextarea';
import { AppButton } from '@components/app/AppButton';
import { ArrowUp, LoaderCircle, Plus, X } from 'lucide-react';
import type { ContentGeneratorMode } from './input-extension';
import { ModeDropdown } from './ModeDropdown';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';

export interface ImageGeneratorContentProps {
	prompt: string;
	loading: boolean;
	mode: ContentGeneratorMode;
	files: File[];
	previewUrls: string[];
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	submitRef: React.RefObject<(() => void) | null>;
	onPromptChange: (value: string) => void;
	onResize: () => void;
	onRemoveFile: (index: number) => void;
	onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onDropZoneClick: () => void;
	onModeChange: (mode: ContentGeneratorMode) => void;
}

export function ImageGeneratorContent({
	prompt,
	loading,
	mode,
	files,
	previewUrls,
	textareaRef,
	fileInputRef,
	submitRef,
	onPromptChange,
	onResize,
	onRemoveFile,
	onFileInputChange,
	onDropZoneClick,
	onModeChange,
}: ImageGeneratorContentProps): React.JSX.Element {
	const { t } = useTranslation();
	const isSubmitDisabled = loading || (!prompt.trim() && files.length === 0);

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

			{previewUrls.length > 0 && (
				<div className="flex flex-wrap gap-2 px-3 pt-1">
					{previewUrls.map((url, index) => (
						<div
							key={index}
							className="group/thumb relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted/40"
						>
							<img
								src={url}
								alt={files[index]?.name ?? ''}
								className="h-full w-full object-cover"
							/>
							<AppButton
								variant="ghost"
								size="icon-xs"
								className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-background/80 text-muted-foreground opacity-0 transition-opacity group-hover/thumb:opacity-100 hover:bg-background hover:text-foreground"
								onMouseDown={(e) => {
									e.preventDefault();
									onRemoveFile(index);
								}}
								aria-label={t('imagePlaceholder.removeImage', {
									defaultValue: 'Remove image',
								})}
							>
								<X className="h-3 w-3" />
							</AppButton>
						</div>
					))}
				</div>
			)}

			<AppTextarea
				ref={textareaRef}
				value={prompt}
				onChange={(e) => {
					onPromptChange(e.target.value);
					onResize();
				}}
				disabled={loading}
				className="min-h-[40px] resize-none border-none bg-transparent px-4 pt-3 pb-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
				placeholder={t('imagePlaceholder.promptPlaceholder', {
					defaultValue: 'Describe the image you want to create...',
				})}
				rows={1}
			/>

			<div className="flex items-center justify-between px-3 pb-2">
				<div className="flex items-center gap-1.5">
					<ModeDropdown mode={mode} disabled={loading} onModeChange={onModeChange} />
					<AppButton
						variant="ghost"
						size="sm"
						className="h-7 gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground"
						disabled={loading}
						onMouseDown={(e) => {
							e.preventDefault();
							onDropZoneClick();
						}}
						aria-label={t('imagePlaceholder.addImage', {
							defaultValue: 'Add image',
						})}
					>
						<Plus className="h-3.5 w-3.5" />
						<span>{t('imagePlaceholder.addImage', { defaultValue: 'Add image' })}</span>
					</AppButton>
				</div>
				<AppButton
					variant="prompt-submit"
					size="prompt-submit-md"
					className="shrink-0"
					disabled={isSubmitDisabled}
					onMouseDown={(e) => {
						e.preventDefault();
						if (!loading) submitRef.current?.();
					}}
					aria-label={t('imagePlaceholder.submit', {
						defaultValue: 'Generate image',
					})}
				>
					{loading ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
				</AppButton>
			</div>
		</>
	);
}
