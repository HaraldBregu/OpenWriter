import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppTextarea } from '@components/app/AppTextarea';
import { AppButton } from '@components/app/AppButton';
import { ArrowUp, ImagePlus, LoaderCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentDropdown } from './AgentDropdown';
import type { AssistantAgentId } from './agents';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';

export interface AssistantContentProps {
	prompt: string;
	agentId: AssistantAgentId;
	files: File[];
	previewUrls: string[];
	loading: boolean;
	enable: boolean;
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	submitRef: React.RefObject<(() => void) | null>;
	onPromptChange: (value: string) => void;
	onAgentChange: (agentId: AssistantAgentId) => void;
	onRemoveFile: (index: number) => void;
	onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onOpenFilePicker: () => void;
	onResize: () => void;
}

export function AssistantContent({
	prompt,
	agentId,
	files,
	previewUrls,
	loading,
	enable,
	textareaRef,
	fileInputRef,
	submitRef,
	onPromptChange,
	onAgentChange,
	onRemoveFile,
	onFileInputChange,
	onOpenFilePicker,
	onResize,
}: AssistantContentProps): React.JSX.Element {
	const { t } = useTranslation();
	const isImage = agentId === 'image';
	const footerHint = loading
		? t('assistantNode.generating', 'Generating response...')
		: !enable
			? t('assistantNode.disabled', 'Assistant unavailable right now.')
			: undefined;
	const isSubmitDisabled =
		!enable || loading || (!prompt.trim() && (!isImage || files.length === 0));

	return (
		<>
			{isImage && (
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
			)}
			{isImage && (
				<div className="border-b border-border/65 bg-muted/[0.28] px-3.5 pb-2 dark:border-white/10 dark:bg-white/[0.03]">
					<div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1">
						<AppButton
							variant="ghost"
							size="sm"
							className="h-16 shrink-0 rounded-[1.15rem] border border-dashed border-border/80 bg-background/76 px-3 text-xs font-medium text-muted-foreground shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_4px_10px_hsl(var(--foreground)/0.04)] hover:border-foreground/18 hover:bg-background hover:text-foreground dark:border-white/14 dark:bg-white/[0.03] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_6px_14px_hsl(var(--background)/0.26)] dark:hover:border-white/18 dark:hover:bg-white/[0.05]"
							disabled={!enable || loading}
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
			)}
			<AppTextarea
				ref={textareaRef}
				value={prompt}
				onChange={(e) => {
					onPromptChange(e.target.value);
					onResize();
				}}
				disabled={!enable}
				className={cn(
					'min-h-[92px] w-full resize-none border-none bg-transparent px-4 pt-4 pb-3 text-sm leading-6 text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
					'placeholder:text-foreground/42 dark:placeholder:text-muted-foreground/70',
					'disabled:cursor-not-allowed disabled:opacity-60'
				)}
				placeholder={
					isImage
						? t(
								'assistantNode.imagePlaceholder',
								'Describe the image you want to create. You can also drop reference images here.'
							)
						: t(
								'assistantNode.placeholder',
								'Ask the assistant to continue, rewrite, or generate from here.'
							)
				}
				rows={1}
			/>
			<div className="flex items-center justify-between gap-3 border-t border-border/65 bg-[linear-gradient(180deg,hsl(var(--muted)/0.22)_0%,hsl(var(--background)/0.22)_100%)] px-3.5 py-2.5 dark:border-white/10 dark:bg-[linear-gradient(180deg,hsl(var(--muted)/0.12)_0%,hsl(var(--background)/0.16)_100%)]">
				<div className="flex min-w-0 items-center gap-2">
					<AgentDropdown
						agentId={agentId}
						disabled={!enable || loading}
						onAgentChange={onAgentChange}
					/>
					{footerHint && (
						<span className="truncate text-[11px] font-medium text-foreground/65 dark:text-muted-foreground/95">
							{footerHint}
						</span>
					)}
				</div>
				<AppButton
					variant="prompt-submit"
					size="prompt-submit-md"
					className="h-7 w-7 shrink-0 rounded-full shadow-[0_6px_14px_hsl(var(--primary)/0.16)] dark:shadow-[0_8px_16px_hsl(var(--primary)/0.18)]"
					disabled={isSubmitDisabled}
					onMouseDown={(e) => {
						e.preventDefault();
						if (!loading) submitRef.current?.();
					}}
					aria-label={t('agenticPanel.send', 'Send message')}
				>
					{loading ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
				</AppButton>
			</div>
		</>
	);
}
