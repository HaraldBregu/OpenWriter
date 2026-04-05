import React from 'react';
import { AppButton } from '@components/app/AppButton';
import {
	AppDropdownMenu,
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	AppDropdownMenuTrigger,
} from '@components/app/AppDropdownMenu';
import { ChevronDown } from 'lucide-react';
import {
	ASSISTANT_AGENT_OPTIONS,
	type AssistantAgentId,
} from './agents';

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
					<span>{current.label}</span>
					<ChevronDown className="h-3 w-3" />
				</AppButton>
			</AppDropdownMenuTrigger>
			<AppDropdownMenuContent align="start" sideOffset={4}>
				{ASSISTANT_AGENT_OPTIONS.map((option) => (
					<AppDropdownMenuItem key={option.value} onSelect={() => onAgentChange(option.value)}>
						<span>{option.label}</span>
					</AppDropdownMenuItem>
				))}
			</AppDropdownMenuContent>
		</AppDropdownMenu>
	);
}
