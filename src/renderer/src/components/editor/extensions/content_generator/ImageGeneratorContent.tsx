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

			<div className="flex gap-2 overflow-x-auto px-3 scrollbar-none">
				{previewUrls.map((url, index) => (
					<div key={index} className="group/thumb relative shrink-0">
						<img
							src={url}
							alt={files[index]?.name ?? ''}
							className="h-10 w-10 rounded-lg object-cover"
						/>
						<AppButton
							variant="ghost"
							size="icon-xs"
							className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-background/80 text-muted-foreground opacity-0 transition-opacity group-hover/thumb:opacity-100 hover:bg-background hover:text-foreground"
							onMouseDown={(e) => {
								e.preventDefault();
								onRemoveFile(index);
							}}
							aria-label={t('imagePlaceholder.removeImage', { defaultValue: 'Remove image' })}
						>
							<X className="h-3 w-3" />
						</AppButton>
					</div>
				))}
				<div
					role="button"
					tabIndex={0}
					className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-muted transition-colors hover:bg-muted/70"
					onMouseDown={(e) => {
						e.preventDefault();
						onDropZoneClick();
					}}
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							onDropZoneClick();
						}
					}}
					aria-label={t('imagePlaceholder.addImage', { defaultValue: 'Add image' })}
				>
					<Plus className="h-4 w-4 text-muted-foreground" />
				</div>
			</div>

			<div className="flex items-end gap-2 px-3">
				<AppTextarea
					ref={textareaRef}
					value={prompt}
					onChange={(e) => {
						onPromptChange(e.target.value);
						onResize();
					}}
					disabled={loading}
					className="min-h-[40px] min-w-0 flex-1 resize-none border-none bg-transparent px-1 pt-1 pb-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
					placeholder={t('imagePlaceholder.promptPlaceholder', {
						defaultValue: 'Describe the image you want to create...',
					})}
					rows={1}
				/>
				<AppButton
					variant="prompt-submit"
					size="prompt-submit-md"
					className="shrink-0"
					disabled={isSubmitDisabled}
					onMouseDown={(e) => {
						e.preventDefault();
						if (!loading) submitRef.current?.();
					}}
					aria-label={t('imagePlaceholder.submit', { defaultValue: 'Generate image' })}
				>
					{loading ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
				</AppButton>
			</div>

			<div className="px-3 pb-2">
				<ModeDropdown mode={mode} disabled={loading} onModeChange={onModeChange} />
			</div>
		</>
	);
}
