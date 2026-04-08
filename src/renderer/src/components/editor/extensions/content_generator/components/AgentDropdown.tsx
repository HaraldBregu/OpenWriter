import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@components/app/AppButton';
import {
	AppDropdownMenu,
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	AppDropdownMenuTrigger,
} from '@components/app/AppDropdownMenu';
import { Check, ChevronDown, ImageIcon, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CONTENT_GENERATOR_AGENT_OPTIONS, type ContentGeneratorAgentId } from '../agents';

function getAgentIcon(agentId: ContentGeneratorAgentId): React.JSX.Element {
	switch (agentId) {
		case 'image':
			return <ImageIcon className="h-4 w-4" />;
		case 'writer':
		default:
			return <PenLine className="h-4 w-4" />;
	}
}

interface AgentDropdownProps {
	agentId: ContentGeneratorAgentId;
	disabled: boolean;
	onAgentChange: (agentId: ContentGeneratorAgentId) => void;
}

export function AgentDropdown({
	agentId,
	disabled,
	onAgentChange,
}: AgentDropdownProps): React.JSX.Element {
	const { t } = useTranslation();

	const current =
		CONTENT_GENERATOR_AGENT_OPTIONS.find((option) => option.value === agentId) ??
		CONTENT_GENERATOR_AGENT_OPTIONS[0];
	const currentLabel = t(current.labelKey, current.labelFallback);

	return (
		<AppDropdownMenu modal={false}>
			<AppDropdownMenuTrigger asChild disabled={disabled}>
				<AppButton
					type="button"
					variant="ghost"
					size="icon"
					className={cn(
						'h-10 w-10 shrink-0 rounded-[1.15rem] border border-border/75 bg-background/78 shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_4px_12px_hsl(var(--foreground)/0.04)] hover:border-foreground/15 hover:bg-background dark:border-white/12 dark:bg-white/[0.04] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_6px_14px_hsl(var(--background)/0.28)] dark:hover:border-white/16 dark:hover:bg-white/[0.05]',
						current.value === 'image'
							? 'text-primary'
							: 'text-foreground'
					)}
					title={currentLabel}
					aria-label={t('assistantNode.switchAgent', 'Switch agent')}
					onMouseDown={(e) => {
						e.preventDefault();
						e.stopPropagation();
					}}
				>
					{getAgentIcon(current.value)}
				</AppButton>
			</AppDropdownMenuTrigger>
			<AppDropdownMenuContent
				align="start"
				side="top"
				sideOffset={8}
				className="z-[120] min-w-[240px] rounded-2xl border border-border/75 bg-background/95 p-1.5 shadow-[0_10px_28px_hsl(var(--foreground)/0.1)] backdrop-blur-xl dark:border-white/12 dark:bg-background/88 dark:shadow-[0_14px_34px_hsl(var(--background)/0.58)]"
			>
				{CONTENT_GENERATOR_AGENT_OPTIONS.map((option) => {
					const label = t(option.labelKey, option.labelFallback);
					const description = t(option.descriptionKey, option.descriptionFallback);
					const isSelected = option.value === current.value;

					return (
						<AppDropdownMenuItem
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
						</AppDropdownMenuItem>
					);
				})}
			</AppDropdownMenuContent>
		</AppDropdownMenu>
	);
}
