import React from 'react';
import { AppButton } from '@components/app/AppButton';
import {
	AppDropdownMenu,
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	AppDropdownMenuTrigger,
} from '@components/app/AppDropdownMenu';
import { ChevronDown, ImageIcon, Palette, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ASSISTANT_AGENT_OPTIONS, type AssistantAgentId } from './agents';

function getAgentIcon(agentId: AssistantAgentId): React.JSX.Element {
	switch (agentId) {
		case 'painter':
			return <Palette className="h-3.5 w-3.5" />;
		case 'image':
			return <ImageIcon className="h-3.5 w-3.5" />;
		case 'writer':
		default:
			return <PenLine className="h-3.5 w-3.5" />;
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
	const current =
		ASSISTANT_AGENT_OPTIONS.find((option) => option.value === agentId) ??
		ASSISTANT_AGENT_OPTIONS[0];

	return (
		<AppDropdownMenu>
			<AppDropdownMenuTrigger asChild>
				<AppButton
					variant="ghost"
					size="sm"
					className={cn(
						'h-7 gap-1.5 rounded-full border border-border/75 bg-background/72 px-2.5 text-xs font-medium text-muted-foreground',
						'shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_4px_12px_hsl(var(--foreground)/0.04)]',
						'hover:border-foreground/15 hover:bg-background hover:text-foreground',
						'dark:border-white/12 dark:bg-white/[0.04] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.04)_inset,0_6px_16px_hsl(var(--background)/0.3)] dark:hover:border-white/16 dark:hover:bg-white/[0.06]'
					)}
					disabled={disabled}
				>
					<span className="text-muted-foreground">{getAgentIcon(current.value)}</span>
					<span>{current.label}</span>
					<ChevronDown className="h-3 w-3" />
				</AppButton>
			</AppDropdownMenuTrigger>
			<AppDropdownMenuContent
				align="start"
				sideOffset={6}
				className="flex min-w-[10rem] flex-col gap-1 rounded-2xl border border-border/75 bg-background/94 p-1.5 shadow-[0_10px_28px_hsl(var(--foreground)/0.1)] backdrop-blur-xl dark:border-white/12 dark:bg-background/88 dark:shadow-[0_14px_34px_hsl(var(--background)/0.58)]"
			>
				{ASSISTANT_AGENT_OPTIONS.map((option) => (
					<AppDropdownMenuItem
						key={option.value}
						onSelect={() => onAgentChange(option.value)}
						className={cn(
							'rounded-xl px-2.5 py-2 text-sm',
							option.value === agentId
								? 'border border-border/70 bg-accent/75 text-foreground dark:border-white/12 dark:bg-white/[0.08]'
								: ''
						)}
					>
						<span className="mr-2 text-muted-foreground">{getAgentIcon(option.value)}</span>
						<span>{option.label}</span>
					</AppDropdownMenuItem>
				))}
			</AppDropdownMenuContent>
		</AppDropdownMenu>
	);
}
