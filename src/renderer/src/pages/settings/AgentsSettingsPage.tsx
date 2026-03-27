import React from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_AGENTS } from '../../../../shared/ai-settings';

// ---------------------------------------------------------------------------
// Section header — small muted text used as a visual divider
// ---------------------------------------------------------------------------

interface SectionHeaderProps {
	readonly title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => (
	<div className="pt-6 pb-2 first:pt-0">
		<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</h2>
	</div>
);

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const AgentsSettingsPage: React.FC = () => {
	const { t } = useTranslation();

	return (
		<div className="w-full max-w-2xl p-6">
			<h1 className="text-lg font-normal mb-6">{t('settings.agents.title')}</h1>

			{DEFAULT_AGENTS.map((agent) => (
				<React.Fragment key={agent.name}>
					<SectionHeader title={agent.name} />
					<p className="text-sm text-muted-foreground">{agent.description}</p>
				</React.Fragment>
			))}
		</div>
	);
};

export default AgentsSettingsPage;
