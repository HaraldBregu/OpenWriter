import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, Check, ChevronDown, ImageIcon, ImagePlus, PenLine, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { cn } from '@/lib/utils';
import {
	CONTENT_GENERATOR_AGENT_OPTIONS,
	type ContentGeneratorAgentId,
} from '@/components/editor/extensions/content_generator/agents';
import { getProvider } from '../../../../../../../shared/providers';
import type { ModelInfo } from '../../../../../../../shared/types';

interface PromptCardProps {
	readonly value: string;
	readonly disabled: boolean;
	readonly isFocused: boolean;
	readonly isDragOver: boolean;
	readonly canSend: boolean;
	readonly agentId: ContentGeneratorAgentId;
	readonly isImage: boolean;
	readonly selectedModel: ModelInfo;
	readonly modelOptions: readonly ModelInfo[];
	readonly previewUrls: readonly string[];
	readonly fileNames: readonly string[];
	readonly selectionLabel?: string | null;
	readonly canClearSelection: boolean;
	readonly placeholder?: string;
	readonly dropStatusId: string;
	readonly currentAgentLabel: string;

	readonly wrapperRef: React.RefObject<HTMLDivElement | null>;
	readonly textareaRef: React.RefObject<HTMLTextAreaElement | null>;

	readonly onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	readonly onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
	readonly onFocus: () => void;
	readonly onWrapperBlur: (e: React.FocusEvent<HTMLDivElement>) => void;
	readonly onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
	readonly onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
	readonly onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
	readonly onSend: () => void;
	readonly onOpenFilePicker: () => void;
	readonly onRemoveImage: (e: React.MouseEvent<HTMLButtonElement>) => void;
	readonly onClearSelection?: () => void;
	readonly onAgentChange: (id: ContentGeneratorAgentId) => void;
	readonly onModelChange: (model: ModelInfo) => void;
}

const PromptCard: React.FC<PromptCardProps> = ({
	value,
	disabled,
	isFocused,
	isDragOver,
	canSend,
	agentId,
	isImage,
	selectedModel,
	modelOptions,
	previewUrls,
	fileNames,
	selectionLabel,
	canClearSelection,
	placeholder,
	dropStatusId,
	currentAgentLabel,
	wrapperRef,
	textareaRef,
	onChange,
	onKeyDown,
	onFocus,
	onWrapperBlur,
	onDragOver,
	onDragLeave,
	onDrop,
	onSend,
	onOpenFilePicker,
	onRemoveImage,
	onClearSelection,
	onAgentChange,
	onModelChange,
}) => {
	const { t } = useTranslation();

	return (
		<div
			ref={wrapperRef}
			onBlur={onWrapperBlur}
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
			className={cn(
				'relative overflow-hidden rounded-[1.4rem] border bg-card/95 text-card-foreground shadow-none backdrop-blur-sm transition-[border-color,background-color] duration-200 dark:bg-card/95',
				isFocused
					? 'border-primary/45 dark:border-primary/55'
					: 'border-border/85 hover:border-foreground/15 dark:border-border/90 dark:hover:border-foreground/15',
				isDragOver && 'border-primary/55 bg-primary/5 dark:border-primary/55 dark:bg-primary/10'
			)}
		>
			<div className="flex items-center gap-2 px-3.5 pt-3">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-7 w-7 rounded-full border border-border/80 bg-background/75 text-foreground/80 shadow-none hover:border-foreground/15 hover:bg-accent/70 dark:border-border/90 dark:bg-background/50 dark:text-foreground/90 dark:hover:bg-accent/80"
					disabled={disabled}
					onClick={onOpenFilePicker}
					title={t('assistantNode.addImage', 'Add image')}
					aria-label={t('assistantNode.addImage', 'Add image')}
					aria-describedby={dropStatusId}
				>
					<ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
				</Button>
			</div>

			{previewUrls.length > 0 && (
				<div
					role="list"
					aria-label={t('agenticPanel.attachedImages', 'Attached reference images')}
					className="flex items-center gap-2 overflow-x-auto px-3.5 pb-1 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
				>
					{previewUrls.map((url, index) => {
						const fileName = fileNames[index] ?? '';
						return (
							<div key={url} role="listitem" className="group/thumb relative shrink-0">
								<div className="h-14 w-14 overflow-hidden rounded-xl border border-border/70 bg-muted/30 dark:border-white/12 dark:bg-white/[0.04]">
									<img src={url} alt={fileName} className="h-full w-full object-cover" />
								</div>
								<button
									type="button"
									data-index={index}
									className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/thumb:opacity-100 group-focus-within/thumb:opacity-100 dark:border-white/12 dark:bg-background"
									onMouseDown={(e) => e.preventDefault()}
									onClick={onRemoveImage}
									aria-label={
										fileName
											? t('assistantNode.removeNamedImage', 'Remove {{name}}', {
													name: fileName,
												})
											: t('assistantNode.removeImage', 'Remove image')
									}
								>
									<X className="h-2.5 w-2.5" aria-hidden="true" />
								</button>
							</div>
						);
					})}
					<button
						type="button"
						role="listitem"
						className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-border/80 bg-background/60 text-muted-foreground transition-colors hover:border-foreground/18 hover:bg-background hover:text-foreground dark:border-white/14 dark:bg-white/[0.03] dark:hover:border-white/18 dark:hover:bg-white/[0.05]"
						disabled={disabled}
						onMouseDown={(e) => e.preventDefault()}
						onClick={onOpenFilePicker}
						aria-label={t('assistantNode.addImage', 'Add image')}
					>
						<ImagePlus className="h-4 w-4" aria-hidden="true" />
					</button>
				</div>
			)}

			{selectionLabel && (
				<div className="flex items-center gap-2 px-3.5 pb-1 pt-3">
					<div
						className="flex max-w-[11.5rem] items-center gap-1 rounded-full border border-border/80 bg-background/75 px-2.5 py-1 text-xs text-foreground/72 shadow-none dark:border-border/90 dark:bg-background/50 dark:text-muted-foreground/95"
						title={selectionLabel}
					>
						<span className="min-w-0 truncate">{selectionLabel}</span>
						{canClearSelection && (
							<button
								type="button"
								onMouseDown={(e) => e.preventDefault()}
								onClick={onClearSelection}
								className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-accent/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-muted-foreground/95 dark:hover:bg-accent/80 dark:hover:text-foreground"
								aria-label={t('agenticPanel.clearSelection', 'Clear selection: {{label}}', {
									label: selectionLabel,
								})}
							>
								<X className="h-3 w-3" aria-hidden="true" />
							</button>
						)}
					</div>
				</div>
			)}

			<Textarea
				ref={textareaRef}
				value={value}
				onChange={onChange}
				onKeyDown={onKeyDown}
				onFocus={onFocus}
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
				<AgentDropdown
					agentId={agentId}
					isImage={isImage}
					disabled={disabled}
					currentAgentLabel={currentAgentLabel}
					onAgentChange={onAgentChange}
				/>

				<ModelDropdown
					selectedModel={selectedModel}
					modelOptions={modelOptions}
					disabled={disabled}
					onModelChange={onModelChange}
				/>

				<div className="flex-1" />

				<Button
					type="button"
					variant={canSend ? 'default' : 'ghost'}
					size="icon"
					onClick={onSend}
					disabled={!canSend}
					aria-label={t('agenticPanel.send', 'Send message')}
					className={cn(
						'h-8 w-8 rounded-full shadow-none transition-colors',
						canSend
							? 'bg-foreground text-background hover:bg-foreground/90 dark:bg-foreground dark:text-background dark:hover:bg-foreground/95'
							: 'text-muted-foreground hover:bg-accent/80 hover:text-foreground dark:text-muted-foreground/90 dark:hover:bg-accent/80 dark:hover:text-foreground'
					)}
				>
					<ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
				</Button>
			</div>
		</div>
	);
};

interface AgentDropdownProps {
	readonly agentId: ContentGeneratorAgentId;
	readonly isImage: boolean;
	readonly disabled: boolean;
	readonly currentAgentLabel: string;
	readonly onAgentChange: (id: ContentGeneratorAgentId) => void;
}

const AgentDropdown: React.FC<AgentDropdownProps> = ({
	agentId,
	isImage,
	disabled,
	currentAgentLabel,
	onAgentChange,
}) => {
	const { t } = useTranslation();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className={cn(
							'h-8 w-8 rounded-full border border-border/80 bg-background/75 shadow-none hover:border-foreground/15 hover:bg-accent/70 dark:border-border/90 dark:bg-background/50 dark:hover:bg-accent/80',
							isImage ? 'text-primary' : 'text-foreground/80 dark:text-foreground/90'
						)}
						disabled={disabled}
						title={currentAgentLabel}
						aria-label={t('assistantNode.switchAgentCurrent', 'Agent: {{agent}}', {
							agent: currentAgentLabel,
						})}
					>
						{isImage ? (
							<ImageIcon className="h-4 w-4" aria-hidden="true" />
						) : (
							<PenLine className="h-4 w-4" aria-hidden="true" />
						)}
					</Button>
				}
			/>
			<DropdownMenuContent
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
						<DropdownMenuItem
							key={option.value}
							onSelect={() => onAgentChange(option.value)}
							aria-current={isSelected ? 'true' : undefined}
							className={cn(
								'rounded-xl px-2.5 py-2.5',
								isSelected && 'bg-accent text-accent-foreground'
							)}
						>
							<span className="flex min-w-0 items-center gap-3">
								<span
									aria-hidden="true"
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
							{isSelected && <Check className="ml-auto h-4 w-4" aria-hidden="true" />}
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

interface ModelDropdownProps {
	readonly selectedModel: ModelInfo;
	readonly modelOptions: readonly ModelInfo[];
	readonly disabled: boolean;
	readonly onModelChange: (model: ModelInfo) => void;
}

const ModelDropdown: React.FC<ModelDropdownProps> = ({
	selectedModel,
	modelOptions,
	disabled,
	onModelChange,
}) => {
	const { t } = useTranslation();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-8 min-w-0 gap-1 rounded-full border border-border/80 bg-background/75 px-3 text-xs text-foreground/80 shadow-none hover:border-foreground/15 hover:bg-accent/70 dark:border-border/90 dark:bg-background/50 dark:text-foreground/90 dark:hover:bg-accent/80"
						disabled={disabled}
						aria-label={t('agenticPanel.selectModelCurrent', 'Model: {{model}}', {
							model: selectedModel.name,
						})}
					>
						<span className="min-w-0 truncate" aria-hidden="true">
							{selectedModel.name}
						</span>
						<ChevronDown className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
					</Button>
				}
			/>
			<DropdownMenuContent
				align="start"
				side="top"
				sideOffset={8}
				className="z-[120] flex max-h-[280px] min-w-[200px] flex-col gap-1 overflow-y-auto rounded-2xl border border-border/75 bg-background/95 p-1.5 shadow-[0_10px_28px_hsl(var(--foreground)/0.1)] backdrop-blur-xl dark:border-white/12 dark:bg-background/88 dark:shadow-[0_14px_34px_hsl(var(--background)/0.58)]"
			>
				{modelOptions.map((model) => (
					<DropdownMenuItem
						key={model.modelId}
						onSelect={() => onModelChange(model)}
						aria-current={selectedModel.modelId === model.modelId ? 'true' : undefined}
						className={cn(
							'rounded-xl px-2.5 py-2.5',
							selectedModel.modelId === model.modelId && 'bg-accent text-accent-foreground'
						)}
					>
						<div className="flex min-w-0 flex-col gap-0.5">
							<span className="truncate text-sm font-medium">{model.name}</span>
							<span className="text-xs text-muted-foreground">
								{getProvider(model.providerId)?.name ?? model.providerId}
							</span>
						</div>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export { PromptCard };
export type { PromptCardProps };
