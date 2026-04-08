import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@components/app/AppButton';
import {
	AppDropdownMenu,
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	AppDropdownMenuTrigger,
} from '@components/app/AppDropdownMenu';
import { ImageIcon, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ASSISTANT_AGENT_OPTIONS, type AssistantAgentId } from '../agents';

function getAgentIcon(agentId: AssistantAgentId): React.JSX.Element {
	switch (agentId) {
		case 'image':
			return <ImageIcon className="h-4 w-4" />;
		case 'writer':
		default:
			return <PenLine className="h-4 w-4" />;
	}
}

interface AgentDropdownProps {
	agentId: AssistantAgentId;
	disabled: boolean;
	onAgentChange: (agentId: AssistantAgentId) => void;
}

export function AgentDropdown({
	agentId,
	disabled,
	onAgentChange,
}: AgentDropdownProps): React.JSX.Element {
	const { t } = useTranslation();

	const current =
		ASSISTANT_AGENT_OPTIONS.find((option) => option.value === agentId) ??
		ASSISTANT_AGENT_OPTIONS[0];

	return (
		<AppDropdownMenu>
			<AppDropdownMenuTrigger asChild>
				<AppButton
					variant="ghost"
					size="icon"
					className={cn(
						'h-8 w-8 rounded-full border border-border/75 bg-background/72 text-muted-foreground',
						'shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_4px_12px_hsl(var(--foreground)/0.04)]',
						'hover:border-foreground/15 hover:bg-background hover:text-foreground',
						'dark:border-white/12 dark:bg-white/[0.04] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.04)_inset,0_6px_16px_hsl(var(--background)/0.3)] dark:hover:border-white/16 dark:hover:bg-white/[0.06]'
					)}
					disabled={disabled}
					aria-label={t('assistantNode.switchAgent', 'Switch agent')}
				>
					{getAgentIcon(current.value)}
				</AppButton>
			</AppDropdownMenuTrigger>
			<AppDropdownMenuContent
				align="start"
				sideOffset={6}
				className="flex min-w-[12rem] flex-col gap-1 rounded-2xl border border-border/75 bg-background/94 p-1.5 shadow-[0_10px_28px_hsl(var(--foreground)/0.1)] backdrop-blur-xl dark:border-white/12 dark:bg-background/88 dark:shadow-[0_14px_34px_hsl(var(--background)/0.58)]"
			>
				{ASSISTANT_AGENT_OPTIONS.map((option) => {
					const label = t(option.labelKey, option.labelFallback);
					const description = t(option.descriptionKey, option.descriptionFallback);
					const isSelected = option.value === agentId;

					return (
						<AppDropdownMenuItem
							key={option.value}
							onSelect={() => onAgentChange(option.value)}
							className={cn(
								'rounded-xl px-2.5 py-2 text-sm',
								isSelected
									? 'border border-border/70 bg-accent/75 text-foreground dark:border-white/12 dark:bg-white/[0.08]'
									: ''
							)}
						>
							<span className="mr-2.5 shrink-0 text-muted-foreground">
								{getAgentIcon(option.value)}
							</span>
							<div className="flex min-w-0 flex-col">
								<span className="font-medium leading-snug">{label}</span>
								<span className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
									{description}
								</span>
							</div>
						</AppDropdownMenuItem>
					);
				})}
			</AppDropdownMenuContent>
		</AppDropdownMenu>
	);
}
