import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@components/app/AppButton';
import {
	AppDropdownMenu,
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	AppDropdownMenuTrigger,
} from '@components/app/AppDropdownMenu';
import { Check, ImageIcon, PenLine } from 'lucide-react';
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

	return (
		<AppDropdownMenu>
			<AppDropdownMenuTrigger asChild disabled={disabled}>
				<AppButton
					type="button"
					variant="ghost"
					size="icon"
					className="h-7 w-7 rounded-full text-muted-foreground hover:bg-accent/80 hover:text-foreground"
					title={t(current.labelKey, current.labelFallback)}
					aria-label={t('assistantNode.switchAgent', 'Switch agent')}
					onMouseDown={(e) => e.preventDefault()}
				>
					{getAgentIcon(current.value)}
				</AppButton>
			</AppDropdownMenuTrigger>
			<AppDropdownMenuContent align="start" sideOffset={6}>
				{CONTENT_GENERATOR_AGENT_OPTIONS.map((option) => {
					const label = t(option.labelKey, option.labelFallback);
					const description = t(option.descriptionKey, option.descriptionFallback);
					const isSelected = option.value === current.value;

					return (
						<AppDropdownMenuItem key={option.value} onSelect={() => onAgentChange(option.value)}>
							<span className="flex items-center gap-2">
								{getAgentIcon(option.value)}
								<span className="flex flex-col">
									<span className="text-sm font-medium">{label}</span>
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
