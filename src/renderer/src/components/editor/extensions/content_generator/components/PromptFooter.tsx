import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, Check, ChevronDown, ImageIcon, LoaderCircle, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CardFooter } from '@/components/ui/Card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { cn } from '@/lib/utils';

import { CONTENT_GENERATOR_AGENT_OPTIONS, type ContentGeneratorAgentId } from '../agents';
import { getProvider } from '../../../../../../../shared/providers';
import type { ModelInfo } from '../../../../../../../shared/types';
import { IMAGE_MODELS, TEXT_MODELS } from '../../../../../../../shared/models';

function getAgentIcon(agentId: ContentGeneratorAgentId): React.JSX.Element {
	switch (agentId) {
		case 'image':
			return <ImageIcon className="h-4 w-4" />;
		case 'writer':
		default:
			return <PenLine className="h-4 w-4" />;
	}
}

interface PromptFooterProps {
	agentId: ContentGeneratorAgentId;
	selectedImageModel: ModelInfo;
	selectedTextModel: ModelInfo;
	loading: boolean;
	isSubmitDisabled: boolean;
	submitRef: React.RefObject<(() => void) | null>;
	onAgentChange: (agentId: ContentGeneratorAgentId) => void;
	onImageModelChange: (model: ModelInfo) => void;
	onTextModelChange: (model: ModelInfo) => void;
}

export function PromptFooter({
	agentId,
	selectedImageModel,
	selectedTextModel,
	loading,
	isSubmitDisabled,
	submitRef,
	onAgentChange,
	onImageModelChange,
	onTextModelChange,
}: PromptFooterProps): React.JSX.Element {
	const { t } = useTranslation();
	const isImage = agentId === 'image';
	const modelOptions = isImage ? IMAGE_MODELS : TEXT_MODELS;
	const selectedModel = isImage ? selectedImageModel : selectedTextModel;
	const handleModelChange = isImage ? onImageModelChange : onTextModelChange;

	const currentAgent =
		CONTENT_GENERATOR_AGENT_OPTIONS.find((option) => option.value === agentId) ??
		CONTENT_GENERATOR_AGENT_OPTIONS[0];
	const currentAgentLabel = t(currentAgent.labelKey, currentAgent.labelFallback);

	return (
		<CardFooter>
			<DropdownMenu modal={false}>
				<DropdownMenuTrigger
					disabled={loading}
					render={
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className={cn(
								'h-10 w-10 shrink-0 rounded-[1.15rem] border border-border/75 bg-background/78 shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_4px_12px_hsl(var(--foreground)/0.04)] hover:border-foreground/15 hover:bg-background dark:border-white/12 dark:bg-white/[0.04] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_6px_14px_hsl(var(--background)/0.28)] dark:hover:border-white/16 dark:hover:bg-white/[0.05]',
								currentAgent.value === 'image' ? 'text-primary' : 'text-foreground'
							)}
							title={currentAgentLabel}
							aria-label={t('assistantNode.switchAgent', 'Switch agent')}
							onMouseDown={(e) => {
								e.preventDefault();
								e.stopPropagation();
							}}
						>
							{getAgentIcon(currentAgent.value)}
						</Button>
					}
				/>
				<DropdownMenuContent
					align="start"
					side="top"
					sideOffset={8}
					className="z-[120] flex min-w-[240px] flex-col gap-1 rounded-2xl border border-border/75 bg-background/95 p-1.5 shadow-[0_10px_28px_hsl(var(--foreground)/0.1)] backdrop-blur-xl dark:border-white/12 dark:bg-background/88 dark:shadow-[0_14px_34px_hsl(var(--background)/0.58)]"
				>
					{CONTENT_GENERATOR_AGENT_OPTIONS.map((option) => {
						const label = t(option.labelKey, option.labelFallback);
						const description = t(option.descriptionKey, option.descriptionFallback);
						const isSelected = option.value === currentAgent.value;

						return (
							<DropdownMenuItem
								key={option.value}
								onSelect={() => onAgentChange(option.value)}
								className={cn(
									'rounded-xl px-2.5 py-2.5',
									isSelected && 'bg-accent text-accent-foreground'
								)}
							>
								<span className="flex min-w-0 items-center gap-3">
									<span
										className={cn(
											'flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border',
											option.value === 'image'
												? 'border-primary/20 bg-primary/10 text-primary dark:border-primary/25 dark:bg-primary/12'
												: 'border-border/70 bg-background/82 text-foreground dark:border-white/12 dark:bg-white/[0.04]'
										)}
									>
										{getAgentIcon(option.value)}
									</span>
									<span className="flex min-w-0 flex-col gap-0.5">
										<span className="truncate text-sm font-medium">{label}</span>
										<span className="text-xs text-muted-foreground">{description}</span>
									</span>
								</span>
								{isSelected && <Check className="ml-auto h-4 w-4" />}
							</DropdownMenuItem>
						);
					})}
				</DropdownMenuContent>
			</DropdownMenu>
			<DropdownMenu modal={false}>
				<DropdownMenuTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={loading}
							className="h-10 min-w-0 gap-1.5 rounded-[1.15rem] border border-border/75 bg-background/78 px-2.5 text-left shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_4px_12px_hsl(var(--foreground)/0.04)] hover:border-foreground/15 hover:bg-background dark:border-white/12 dark:bg-white/[0.04] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_6px_14px_hsl(var(--background)/0.28)] dark:hover:border-white/16 dark:hover:bg-white/[0.05]"
							onMouseDown={(e) => {
								e.preventDefault();
								e.stopPropagation();
							}}
						>
							<span className="truncate text-xs font-medium text-foreground">
								{selectedModel.name}
							</span>
							<ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/80" />
						</Button>
					}
				/>
				<DropdownMenuContent
					align="start"
					side="top"
					sideOffset={8}
					className="z-[120] flex max-h-[280px] min-w-[220px] flex-col gap-1 overflow-y-auto rounded-2xl border border-border/75 bg-background/95 p-1.5 shadow-[0_10px_28px_hsl(var(--foreground)/0.1)] backdrop-blur-xl dark:border-white/12 dark:bg-background/88 dark:shadow-[0_14px_34px_hsl(var(--background)/0.58)]"
				>
					{modelOptions.map((model) => (
						<DropdownMenuItem
							key={model.modelId}
							onSelect={() => handleModelChange(model)}
							className={cn(
								'rounded-xl px-2.5 py-2.5',
								selectedModel.modelId === model.modelId &&
									'bg-accent text-accent-foreground'
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
			<div className="ml-auto shrink-0">
				<Button
					variant="prompt-submit"
					size="prompt-submit-md"
					className="h-10 w-10 shrink-0 rounded-full shadow-[0_10px_22px_hsl(var(--primary)/0.18)] dark:shadow-[0_12px_24px_hsl(var(--primary)/0.2)]"
					disabled={isSubmitDisabled}
					onMouseDown={(e) => e.preventDefault()}
					onClick={() => {
						if (!loading) submitRef.current?.();
					}}
					aria-label={t('agenticPanel.send', 'Send message')}
				>
					{loading ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
				</Button>
			</div>
		</CardFooter>
	);
}
