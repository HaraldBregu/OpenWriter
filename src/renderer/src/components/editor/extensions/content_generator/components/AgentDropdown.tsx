import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@components/app/AppButton';
import { ImageIcon, PenLine } from 'lucide-react';
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

	return (
		<div
			className="inline-flex items-center rounded-full border border-border/75 bg-background/78 p-1 shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_4px_12px_hsl(var(--foreground)/0.04)] dark:border-white/12 dark:bg-white/[0.04] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_6px_14px_hsl(var(--background)/0.28)]"
			role="group"
			aria-label={t('assistantNode.switchAgent', 'Switch agent')}
		>
			{CONTENT_GENERATOR_AGENT_OPTIONS.map((option) => {
				const label = t(option.labelKey, option.labelFallback);
				const isSelected = option.value === current.value;

				return (
					<AppButton
						key={option.value}
						type="button"
						variant="ghost"
						size="sm"
						className={cn(
							'h-7 gap-1.5 rounded-full px-3 text-xs font-semibold shadow-none',
							isSelected
								? 'bg-foreground text-background hover:bg-foreground/92 dark:bg-foreground dark:text-background dark:hover:bg-foreground/92'
								: 'text-muted-foreground hover:bg-accent/80 hover:text-foreground dark:text-muted-foreground/95 dark:hover:bg-accent/80 dark:hover:text-foreground'
						)}
						disabled={disabled}
						aria-pressed={isSelected}
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => {
							if (!isSelected) onAgentChange(option.value);
						}}
					>
						<span className="shrink-0">{getAgentIcon(option.value)}</span>
						<span>{label}</span>
					</AppButton>
				);
			})}
		</div>
	);
}
