import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, LoaderCircle } from 'lucide-react';
import { AppButton } from '@components/app/AppButton';
import { AgentDropdown } from './AgentDropdown';
import type { AssistantAgentId } from '../agents';

interface PromptFooterProps {
	agentId: AssistantAgentId;
	hint: string | undefined;
	loading: boolean;
	isSubmitDisabled: boolean;
	submitRef: React.RefObject<(() => void) | null>;
	onAgentChange: (agentId: AssistantAgentId) => void;
}

export function PromptFooter({
	agentId,
	hint,
	loading,
	isSubmitDisabled,
	submitRef,
	onAgentChange,
}: PromptFooterProps): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<div className="flex items-center justify-between gap-3 border-t border-border/65 bg-[linear-gradient(180deg,hsl(var(--muted)/0.22)_0%,hsl(var(--background)/0.22)_100%)] px-3.5 py-2.5 dark:border-white/10 dark:bg-[linear-gradient(180deg,hsl(var(--muted)/0.12)_0%,hsl(var(--background)/0.16)_100%)]">
			<div className="flex min-w-0 items-center gap-2">
				<AgentDropdown
					agentId={agentId}
					disabled={isSubmitDisabled && !loading}
					onAgentChange={onAgentChange}
				/>
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
