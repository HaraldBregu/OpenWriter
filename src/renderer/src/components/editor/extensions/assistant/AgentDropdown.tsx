import React from 'react';
import { AppButton } from '@components/app/AppButton';
import {
	AppDropdownMenu,
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	AppDropdownMenuTrigger,
} from '@components/app/AppDropdownMenu';
import { ChevronDown, Palette, PenLine } from 'lucide-react';
import {
	ASSISTANT_AGENT_OPTIONS,
	type AssistantAgentId,
} from './agents';

function getAgentIcon(agentId: AssistantAgentId): React.JSX.Element {
	switch (agentId) {
		case 'painter':
			return <Palette className="h-3.5 w-3.5" />;
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
					className="h-7 gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground"
					disabled={disabled}
				>
					<span className="text-muted-foreground">{getAgentIcon(current.value)}</span>
					<span>{current.label}</span>
					<ChevronDown className="h-3 w-3" />
				</AppButton>
			</AppDropdownMenuTrigger>
			<AppDropdownMenuContent align="start" sideOffset={4}>
				{ASSISTANT_AGENT_OPTIONS.map((option) => (
					<AppDropdownMenuItem key={option.value} onSelect={() => onAgentChange(option.value)}>
						<span className="mr-2 text-muted-foreground">{getAgentIcon(option.value)}</span>
						<span>{option.label}</span>
					</AppDropdownMenuItem>
				))}
			</AppDropdownMenuContent>
		</AppDropdownMenu>
	);
}
