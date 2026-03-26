import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Plus } from 'lucide-react';
import { AppButton } from '../../components/app';

// ------------------------------------------------------------------
// Empty state
// ------------------------------------------------------------------

const AgentsEmptyState: React.FC = () => {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col items-center justify-center flex-1 gap-4 text-center px-6 py-16">
			<div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
				<Bot className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
			</div>
			<div className="space-y-1 max-w-xs">
				<p className="text-sm font-medium text-foreground">
					{t('agents.emptyTitle', 'No agents yet')}
				</p>
				<p className="text-xs text-muted-foreground">
					{t('agents.emptyDescription', 'Create an agent to automate tasks in your workspace.')}
				</p>
			</div>
		</div>
	);
};

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

const AgentsPage: React.FC = () => {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
				<div>
					<h1 className="text-sm font-semibold text-foreground">{t('agents.title', 'Agents')}</h1>
					<p className="text-xs text-muted-foreground mt-0.5">
						{t('agents.subtitle', 'Manage the AI agents for your workspace.')}
					</p>
				</div>
				<AppButton type="button" size="sm" className="gap-1.5">
					<Plus className="h-3.5 w-3.5" aria-hidden="true" />
					{t('agents.newAgent', 'New Agent')}
				</AppButton>
			</div>

			{/* Content */}
			<div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
				<AgentsEmptyState />
			</div>
		</div>
	);
};

export default AgentsPage;
