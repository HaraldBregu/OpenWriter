import React, { useState, useRef, useCallback, useMemo, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, Check, ChevronDown, ImageIcon, ImagePlus, PenLine, X } from 'lucide-react';
import {
	AppButton,
	AppTextarea,
	AppDropdownMenu,
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	AppDropdownMenuTrigger,
} from '@/components/app';
import { cn } from '@/lib/utils';
import {
	CONTENT_GENERATOR_AGENT_OPTIONS,
	type ContentGeneratorAgentId,
} from '@/components/editor/extensions/content_generator/agents';
import { IMAGE_MODELS, TEXT_MODELS } from '../../../../../../../shared/models';
import { DEFAULT_TEXT_MODEL_ID } from '../../../../../../../shared/types';
import type { ModelInfo } from '../../../../../../../shared/types';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';

function readFileAsDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (): void => resolve(reader.result as string);
		reader.onerror = (): void => reject(new Error(`FileReader failed for ${file.name}`));
		reader.readAsDataURL(file);
	});
}

interface InputProps {
	readonly onSend: (message: string) => void;
	readonly disabled?: boolean;
	readonly selectionLabel?: string | null;
	readonly canClearSelection?: boolean;
	readonly onClearSelection?: () => void;
	readonly placeholder?: string;
}

const Input: React.FC<InputProps> = ({
	onSend,
	disabled = false,
	selectionLabel,
	canClearSelection = false,
	onClearSelection,
	placeholder,
}) => {
	const { t } = useTranslation();
	const [value, setValue] = useState('');
	const [isFocused, setIsFocused] = useState(false);
	const [agentId, setAgentId] = useState<ContentGeneratorAgentId>('writer');
	const [selectedImageModel, setSelectedImageModel] = useState<ModelInfo>(IMAGE_MODELS[0]);
	const [selectedTextModel, setSelectedTextModel] = useState<ModelInfo>(
		() => TEXT_MODELS.find((m) => m.modelId === DEFAULT_TEXT_MODEL_ID) ?? TEXT_MODELS[0]
	);
	const [files, setFiles] = useState<File[]>([]);
	const [previewUrls, setPreviewUrls] = useState<string[]>([]);
	const [isDragOver, setIsDragOver] = useState(false);

	const wrapperRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const isImage = agentId === 'image';
	const modelOptions = isImage ? IMAGE_MODELS : TEXT_MODELS;
	const selectedModel = isImage ? selectedImageModel : selectedTextModel;

	const adjustHeight = useCallback(() => {
		const el = textareaRef.current;
		if (!el) return;
		el.style.height = 'auto';
		const maxHeightPx = 160;
		el.style.height = `${Math.min(el.scrollHeight, maxHeightPx)}px`;
	}, []);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			setValue(e.target.value);
			adjustHeight();
		},
		[adjustHeight]
	);

	const handleSend = useCallback(() => {
		const trimmed = value.trim();
		if (!trimmed || disabled) return;
		onSend(trimmed);
		setValue('');
		setFiles([]);
		setPreviewUrls([]);
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto';
		}
	}, [value, disabled, onSend]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				handleSend();
			}
		},
		[handleSend]
	);

	const addFile = useCallback((newFile: File) => {
		readFileAsDataUri(newFile)
			.then((result) => {
				setFiles((prev) => [...prev, newFile]);
				setPreviewUrls((prev) => [...prev, result]);
			})
			.catch(() => {
				// FileReader failed — do not add the file to avoid files/previewUrls desync
			});
	}, []);

	const removeFile = useCallback((index: number) => {
		setFiles((prev) => prev.filter((_, i) => i !== index));
		setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const handleRemoveClick = useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
			const index = Number(e.currentTarget.dataset.index);
			removeFile(index);
		},
		[removeFile]
	);

	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const selected = e.target.files;
			if (!selected) return;
			for (const file of Array.from(selected)) {
				if (file.type.startsWith('image/')) addFile(file);
			}
			e.target.value = '';
		},
		[addFile]
	);

	const openFilePicker = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const handleDragOver = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			if (!isImage) return;
			e.preventDefault();
			setIsDragOver(true);
		},
		[isImage]
	);

	const handleDragLeave = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			if (!isImage) return;
			e.preventDefault();
			setIsDragOver(false);
		},
		[isImage]
	);

	const handleDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			if (!isImage) return;
			e.preventDefault();
			setIsDragOver(false);
			for (const file of Array.from(e.dataTransfer.files)) {
				if (file.type.startsWith('image/')) addFile(file);
			}
		},
		[addFile, isImage]
	);

	const handleModelChange = useCallback(
		(model: ModelInfo) => {
			if (isImage) setSelectedImageModel(model);
			else setSelectedTextModel(model);
		},
		[isImage]
	);

	const canSend = useMemo(() => value.trim().length > 0 && !disabled, [value, disabled]);

	const currentAgent = useMemo(
		() =>
			CONTENT_GENERATOR_AGENT_OPTIONS.find((o) => o.value === agentId) ??
			CONTENT_GENERATOR_AGENT_OPTIONS[0],
		[agentId]
	);

	const handleFocus = useCallback(() => {
		setIsFocused(true);
	}, []);

	const handleWrapperBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
		if (wrapperRef.current?.contains(e.relatedTarget as Node | null)) return;
		setIsFocused(false);
	}, []);

	return (
		<div className="shrink-0 px-3 pb-3 pt-1">
			<input
				ref={fileInputRef}
				type="file"
				accept={ACCEPTED_IMAGE_TYPES}
				className="hidden"
				onChange={handleFileInputChange}
				aria-hidden="true"
				tabIndex={-1}
				multiple
			/>
			<div
				ref={wrapperRef}
				onBlur={handleWrapperBlur}
				onDragOver={isImage ? handleDragOver : undefined}
				onDragLeave={isImage ? handleDragLeave : undefined}
				onDrop={isImage ? handleDrop : undefined}
				className={cn(
					'relative overflow-hidden rounded-[1.4rem] border bg-card/95 text-card-foreground shadow-none backdrop-blur-sm transition-[border-color,background-color] duration-200 dark:bg-card/95',
					isFocused
						? 'border-primary/45 dark:border-primary/55'
						: 'border-border/85 hover:border-foreground/15 dark:border-border/90 dark:hover:border-foreground/15',
					isImage &&
						isDragOver &&
						'border-primary/55 bg-primary/5 dark:border-primary/55 dark:bg-primary/10'
				)}
			>
				{previewUrls.length > 0 && (
					<div className="flex items-center gap-2 overflow-x-auto px-3.5 pb-1 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
						{previewUrls.map((url, index) => (
							<div key={url} className="group/thumb relative shrink-0">
								<div className="h-14 w-14 overflow-hidden rounded-xl border border-border/70 bg-muted/30 dark:border-white/12 dark:bg-white/[0.04]">
									<img
										src={url}
										alt={files[index]?.name ?? ''}
										className="h-full w-full object-cover"
									/>
								</div>
								<button
									type="button"
									data-index={index}
									className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/thumb:opacity-100 dark:border-white/12 dark:bg-background"
									onMouseDown={(e) => e.preventDefault()}
									onClick={handleRemoveClick}
									aria-label={t('assistantNode.removeImage', 'Remove image')}
								>
									<X className="h-2.5 w-2.5" />
								</button>
							</div>
						))}
						<button
							type="button"
							className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-border/80 bg-background/60 text-muted-foreground transition-colors hover:border-foreground/18 hover:bg-background hover:text-foreground dark:border-white/14 dark:bg-white/[0.03] dark:hover:border-white/18 dark:hover:bg-white/[0.05]"
							disabled={disabled}
							onMouseDown={(e) => e.preventDefault()}
							onClick={openFilePicker}
							aria-label={t('assistantNode.addImage', 'Add image')}
						>
							<ImagePlus className="h-4 w-4" />
						</button>
					</div>
				)}

				{isImage && files.length === 0 && (
					<div
						className={cn(
							'mx-3.5 mb-1 mt-3 overflow-hidden rounded-2xl border border-dashed transition-[border-color,background-color]',
							isDragOver
								? 'border-primary/50 bg-primary/8 dark:bg-primary/12'
								: 'border-border/75 bg-muted/20 dark:border-white/12 dark:bg-white/[0.03]'
						)}
					>
						<div
							role="button"
							tabIndex={disabled ? -1 : 0}
							onMouseDown={(e) => e.preventDefault()}
							onClick={disabled ? undefined : openFilePicker}
							onKeyDown={(e) => {
								if (disabled) return;
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									openFilePicker();
								}
							}}
							aria-label={t('assistantNode.browseReferenceImages', 'Browse reference images')}
							className="flex min-h-[4.5rem] items-center justify-center px-4 py-3 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<div className="flex items-center gap-2.5">
								<div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-background/85 text-muted-foreground dark:border-white/12 dark:bg-white/[0.05]">
									<ImagePlus className="h-3.5 w-3.5" />
								</div>
								<div className="flex flex-col gap-0.5 text-left">
									<span className="text-xs font-medium text-foreground">
										{t('assistantNode.dropImagesTitle', 'Drop images or browse')}
									</span>
									<span className="text-[11px] text-muted-foreground">
										{t(
											'assistantNode.dropImagesDescription',
											'Optional references for style or mood.'
										)}
									</span>
								</div>
							</div>
						</div>
					</div>
				)}

				<AppTextarea
					ref={textareaRef}
					value={value}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					onFocus={handleFocus}
					disabled={disabled}
					rows={3}
					placeholder={
						placeholder ??
						t('agenticPanel.inputPlaceholder', 'Ask the assistant for context, facts, or ideas')
					}
					aria-label={t('agenticPanel.inputAriaLabel', 'Chat message input')}
					className="w-full resize-none border-none bg-transparent px-4 pb-3 pt-4 text-sm leading-6 text-foreground shadow-none placeholder:text-foreground/45 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:placeholder:text-muted-foreground/80"
				/>

				<div className="flex items-center gap-2 border-t border-border/70 bg-muted/45 px-3.5 py-2.5 dark:border-border/80 dark:bg-muted/20">
					{selectionLabel && (
						<div
							className="flex max-w-[11.5rem] items-center gap-1 rounded-full border border-border/80 bg-background/75 px-2.5 py-1 text-xs text-foreground/72 shadow-none dark:border-border/90 dark:bg-background/50 dark:text-muted-foreground/95"
							title={selectionLabel}
							aria-label={selectionLabel}
						>
							<span className="min-w-0 truncate">{selectionLabel}</span>
							{canClearSelection && (
								<button
									type="button"
									onMouseDown={(e) => e.preventDefault()}
									onClick={onClearSelection}
									className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-accent/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-muted-foreground/95 dark:hover:bg-accent/80 dark:hover:text-foreground"
									aria-label={t('agenticPanel.clearSelection', 'Clear selection')}
								>
									<X className="h-3 w-3" aria-hidden="true" />
								</button>
							)}
						</div>
					)}

					<AppDropdownMenu>
						<AppDropdownMenuTrigger asChild>
							<AppButton
								type="button"
								variant="ghost"
								size="sm"
								className={cn(
									'h-7 gap-1.5 rounded-full border border-border/80 bg-background/75 px-2.5 text-xs shadow-none hover:border-foreground/15 hover:bg-accent/70 dark:border-border/90 dark:bg-background/50 dark:hover:bg-accent/80',
									isImage ? 'text-primary' : 'text-foreground/80 dark:text-foreground/90'
								)}
								disabled={disabled}
								aria-label={t('assistantNode.switchAgent', 'Switch agent')}
							>
								{isImage ? (
									<ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
								) : (
									<PenLine className="h-3.5 w-3.5" aria-hidden="true" />
								)}
								<span className="min-w-0 truncate">
									{t(currentAgent.labelKey, currentAgent.labelFallback)}
								</span>
								<ChevronDown className="h-3 w-3 opacity-70" aria-hidden="true" />
							</AppButton>
						</AppDropdownMenuTrigger>
						<AppDropdownMenuContent
							align="start"
							side="top"
							sideOffset={8}
							className="z-[120] flex min-w-[220px] flex-col gap-1 rounded-2xl border border-border/75 bg-background/95 p-1.5 shadow-[0_10px_28px_hsl(var(--foreground)/0.1)] backdrop-blur-xl dark:border-white/12 dark:bg-background/88 dark:shadow-[0_14px_34px_hsl(var(--background)/0.58)]"
						>
							{CONTENT_GENERATOR_AGENT_OPTIONS.map((option) => {
								const label = t(option.labelKey, option.labelFallback);
								const description = t(option.descriptionKey, option.descriptionFallback);
								const isSelected = option.value === agentId;

								return (
									<AppDropdownMenuItem
										key={option.value}
										onSelect={() => setAgentId(option.value)}
										className={cn(
											'rounded-xl px-2.5 py-2.5',
											isSelected && 'bg-accent text-accent-foreground'
										)}
									>
										<span className="flex min-w-0 items-center gap-3">
											<span
												className={cn(
													'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border',
													option.value === 'image'
														? 'border-primary/20 bg-primary/10 text-primary dark:border-primary/25 dark:bg-primary/12'
														: 'border-border/70 bg-background/82 text-foreground dark:border-white/12 dark:bg-white/[0.04]'
												)}
											>
												{option.value === 'image' ? (
													<ImageIcon className="h-3.5 w-3.5" />
												) : (
													<PenLine className="h-3.5 w-3.5" />
												)}
											</span>
											<span className="flex min-w-0 flex-col gap-0.5">
												<span className="truncate text-sm font-medium">{label}</span>
												<span className="text-xs text-muted-foreground">{description}</span>
											</span>
										</span>
										{isSelected && <Check className="ml-auto h-4 w-4" />}
									</AppDropdownMenuItem>
								);
							})}
						</AppDropdownMenuContent>
					</AppDropdownMenu>

					<AppDropdownMenu>
						<AppDropdownMenuTrigger asChild>
							<AppButton
								type="button"
								variant="ghost"
								size="sm"
								className="h-7 min-w-0 gap-1 rounded-full border border-border/80 bg-background/75 px-2.5 text-xs text-foreground/80 shadow-none hover:border-foreground/15 hover:bg-accent/70 dark:border-border/90 dark:bg-background/50 dark:text-foreground/90 dark:hover:bg-accent/80"
								disabled={disabled}
								aria-label={t('agenticPanel.selectModel', 'Select model')}
							>
								<span className="min-w-0 truncate">{selectedModel.name}</span>
								<ChevronDown className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
							</AppButton>
						</AppDropdownMenuTrigger>
						<AppDropdownMenuContent
							align="start"
							side="top"
							sideOffset={8}
							className="z-[120] flex max-h-[280px] min-w-[200px] flex-col gap-1 overflow-y-auto rounded-2xl border border-border/75 bg-background/95 p-1.5 shadow-[0_10px_28px_hsl(var(--foreground)/0.1)] backdrop-blur-xl dark:border-white/12 dark:bg-background/88 dark:shadow-[0_14px_34px_hsl(var(--background)/0.58)]"
						>
							{modelOptions.map((model) => (
								<AppDropdownMenuItem
									key={model.modelId}
									onSelect={() => handleModelChange(model)}
									className={cn(
										'rounded-xl px-2.5 py-2.5',
										selectedModel.modelId === model.modelId && 'bg-accent text-accent-foreground'
									)}
								>
									<div className="flex min-w-0 flex-col gap-0.5">
										<span className="truncate text-sm font-medium">{model.name}</span>
										<span className="text-xs text-muted-foreground">{model.provider}</span>
									</div>
								</AppDropdownMenuItem>
							))}
						</AppDropdownMenuContent>
					</AppDropdownMenu>

					<div className="flex-1" />

					<AppButton
						type="button"
						variant={canSend ? 'default' : 'ghost'}
						size="icon"
						onClick={handleSend}
						disabled={!canSend}
						aria-label={t('agenticPanel.send', 'Send message')}
						className={cn(
							'h-7 w-7 rounded-full shadow-none transition-colors',
							canSend
								? 'bg-foreground text-background hover:bg-foreground/90 dark:bg-foreground dark:text-background dark:hover:bg-foreground/95'
								: 'text-muted-foreground hover:bg-accent/80 hover:text-foreground dark:text-muted-foreground/90 dark:hover:bg-accent/80 dark:hover:text-foreground'
						)}
					>
						<ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
					</AppButton>
				</div>
			</div>
		</div>
	);
};

export { Input };
export type { InputProps };
