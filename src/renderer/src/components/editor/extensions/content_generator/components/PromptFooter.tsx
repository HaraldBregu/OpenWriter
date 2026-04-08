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
import { IMAGE_MODELS, WRITING_MODELS } from '../../../../../../../shared/models';

interface PromptFooterProps {
	agentId: ContentGeneratorAgentId;
	selectedImageModel: ModelInfo;
	hint: string | undefined;
	loading: boolean;
	isSubmitDisabled: boolean;
	submitRef: React.RefObject<(() => void) | null>;
	onAgentChange: (agentId: ContentGeneratorAgentId) => void;
	onImageModelChange: (model: ModelInfo) => void;
}

export function PromptFooter({
	agentId,
	selectedImageModel,
	hint,
	loading,
	isSubmitDisabled,
	submitRef,
	onAgentChange,
	onImageModelChange,
}: PromptFooterProps): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<div className="flex items-center justify-between gap-3 border-t border-border/65 bg-[linear-gradient(180deg,hsl(var(--muted)/0.22)_0%,hsl(var(--background)/0.22)_100%)] px-3.5 py-2.5 dark:border-white/10 dark:bg-[linear-gradient(180deg,hsl(var(--muted)/0.12)_0%,hsl(var(--background)/0.16)_100%)]">
			<div className="flex min-w-0 items-center gap-2">
				<AgentDropdown agentId={agentId} disabled={false} onAgentChange={onAgentChange} />
				{agentId === 'image' && (
					<AppDropdownMenu>
						<AppDropdownMenuTrigger asChild>
							<AppButton
								variant="ghost"
								size="sm"
								disabled={loading}
								className="h-7 gap-1 px-2 text-[11px] font-medium text-foreground/65 hover:text-foreground dark:text-muted-foreground/95 dark:hover:text-foreground"
							>
								<span className="truncate">{selectedImageModel.name}</span>
								<ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
							</AppButton>
						</AppDropdownMenuTrigger>
						<AppDropdownMenuContent align="start" side="top" className="min-w-[180px]">
							{IMAGE_MODELS.map((model) => (
								<AppDropdownMenuItem
									key={model.modelId}
									onSelect={() => onImageModelChange(model)}
									className={cn(
										selectedImageModel.modelId === model.modelId &&
											'bg-accent text-accent-foreground'
									)}
								>
									<div className="flex flex-col gap-0.5">
										<span className="text-xs font-medium">{model.name}</span>
										<span className="text-[10px] text-muted-foreground">{model.provider}</span>
									</div>
								</AppDropdownMenuItem>
							))}
						</AppDropdownMenuContent>
					</AppDropdownMenu>
				)}
				{hint && (
					<span className="truncate text-[11px] font-medium text-foreground/65 dark:text-muted-foreground/95">
						{hint}
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
	);
}
