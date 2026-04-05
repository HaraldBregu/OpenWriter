import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppTextarea } from '@components/app/AppTextarea';
import { AppButton } from '@components/app/AppButton';
import { ArrowUp, ImagePlus, LoaderCircle, X } from 'lucide-react';
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
	const isPainter = agentId === 'painter';
	const footerHint = loading
		? t('assistantNode.generating', 'Generating response...')
		: !enable
			? t('assistantNode.disabled', 'Assistant unavailable right now.')
			: undefined;
	const isSubmitDisabled =
		!enable || loading || (!prompt.trim() && (!isPainter || files.length === 0));

	return (
		<>
			{isPainter && (
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
			{isPainter && (
				<div className="border-b border-border/70 px-3.5 pt-3 pb-2 dark:border-border/80">
					<div className="flex items-center gap-2 overflow-x-auto pb-1">
						<AppButton
							variant="ghost"
							size="sm"
							className="h-16 shrink-0 rounded-2xl border border-dashed border-border/75 px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
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
								className="group/thumb relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border/70 bg-muted/40"
							>
								<img
									src={url}
									alt={files[index]?.name ?? ''}
									className="h-full w-full object-cover"
								/>
								<AppButton
									variant="ghost"
									size="icon-xs"
									className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-background/90 text-muted-foreground opacity-0 transition-opacity group-hover/thumb:opacity-100 hover:bg-background hover:text-foreground"
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
				className="min-h-[92px] w-full resize-none border-none bg-transparent px-4 pt-4 pb-3 text-sm leading-6 text-foreground placeholder:text-foreground/45 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60 dark:placeholder:text-muted-foreground/75"
				placeholder={
					isPainter
						? t(
								'assistantNode.painterPlaceholder',
								'Describe the image you want to create. You can also drop reference images here.'
							)
						: t(
								'assistantNode.placeholder',
								'Ask the assistant to continue, rewrite, or generate from here.'
							)
				}
				rows={1}
			/>
			<div className="flex items-center justify-between gap-3 border-t border-border/70 bg-muted/45 px-3.5 py-2.5 dark:border-border/80 dark:bg-muted/20">
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
					className="h-7 w-7 shrink-0 rounded-full"
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
