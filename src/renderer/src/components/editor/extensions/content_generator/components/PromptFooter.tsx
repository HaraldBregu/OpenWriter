import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, LoaderCircle, ChevronDown } from 'lucide-react';
import { AppButton } from '@components/app/AppButton';
import {
	AppDropdownMenu,
	AppDropdownMenuTrigger,
	AppDropdownMenuContent,
	AppDropdownMenuItem,
} from '@components/app/AppDropdownMenu';
import { cn } from '@/lib/utils';
import { AgentDropdown } from './AgentDropdown';
import type { ContentGeneratorAgentId } from '../agents';
import type { ModelInfo } from '../../../../../../../shared/types';
import { IMAGE_MODELS, TEXT_MODELS } from '../../../../../../../shared/models';

type PromptFooterHintTone = 'default' | 'loading' | 'disabled';

interface PromptFooterProps {
	agentId: ContentGeneratorAgentId;
	selectedImageModel: ModelInfo;
	selectedTextModel: ModelInfo;
	hint: string | undefined;
	hintId: string;
	hintTone: PromptFooterHintTone;
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
	hint,
	hintId,
	hintTone,
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

	return (
		<div className="border-t border-border/65 bg-[linear-gradient(180deg,hsl(var(--muted)/0.2)_0%,hsl(var(--background)/0.18)_100%)] px-4 py-3.5 dark:border-white/10 dark:bg-[linear-gradient(180deg,hsl(var(--muted)/0.12)_0%,hsl(var(--background)/0.14)_100%)]">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div className="flex min-w-0 flex-1 flex-col gap-2.5">
					<div className="grid gap-2 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
						<AgentDropdown agentId={agentId} disabled={loading} onAgentChange={onAgentChange} />
						<AppDropdownMenu modal={false}>
							<AppDropdownMenuTrigger asChild>
								<AppButton
									type="button"
									variant="ghost"
									size="sm"
									disabled={loading}
									className="h-auto min-h-[3rem] w-full justify-start gap-3 rounded-[1.15rem] border border-border/75 bg-background/78 px-3 py-2 text-left shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_4px_12px_hsl(var(--foreground)/0.04)] hover:border-foreground/15 hover:bg-background dark:border-white/12 dark:bg-white/[0.04] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_6px_14px_hsl(var(--background)/0.28)] dark:hover:border-white/16 dark:hover:bg-white/[0.05]"
									onMouseDown={(e) => {
										e.preventDefault();
										e.stopPropagation();
									}}
								>
									<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-background/82 text-foreground shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_4px_10px_hsl(var(--foreground)/0.04)] dark:border-white/12 dark:bg-white/[0.04]">
										<ChevronDown className="h-4 w-4" />
									</span>
									<span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
										<span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:text-muted-foreground/95">
											{t('assistantNode.model', 'Model')}
										</span>
										<span className="truncate text-sm font-semibold text-foreground">
											{selectedModel.name}
										</span>
									</span>
									<span className="hidden text-[11px] font-medium text-muted-foreground/90 md:block">
										{selectedModel.provider}
									</span>
									<ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
								</AppButton>
							</AppDropdownMenuTrigger>
							<AppDropdownMenuContent
								align="start"
								side="top"
								sideOffset={8}
								className="z-[120] max-h-[280px] min-w-[220px] overflow-y-auto rounded-2xl border border-border/75 bg-background/95 p-1.5 shadow-[0_10px_28px_hsl(var(--foreground)/0.1)] backdrop-blur-xl dark:border-white/12 dark:bg-background/88 dark:shadow-[0_14px_34px_hsl(var(--background)/0.58)]"
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
					</div>
					{hint ? (
						<div
							id={hintId}
							aria-live="polite"
							className={cn(
								'flex min-w-0 items-center gap-2 text-[11px] font-medium',
								hintTone === 'loading'
									? 'text-primary'
									: hintTone === 'disabled'
										? 'text-muted-foreground/80 dark:text-muted-foreground/90'
										: 'text-muted-foreground dark:text-muted-foreground/95'
							)}
						>
							<span
								className={cn(
									'h-1.5 w-1.5 shrink-0 rounded-full',
									hintTone === 'loading'
										? 'animate-pulse bg-primary'
										: hintTone === 'disabled'
											? 'bg-muted-foreground/45'
											: 'bg-foreground/20 dark:bg-foreground/28'
								)}
							/>
							<span className="truncate">{hint}</span>
						</div>
					) : null}
				</div>
				<div className="flex justify-end sm:shrink-0">
					<AppButton
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
					</AppButton>
				</div>
			</div>
		</div>
	);
}
