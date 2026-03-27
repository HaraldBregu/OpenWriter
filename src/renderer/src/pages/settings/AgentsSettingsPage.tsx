import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_AGENTS } from '../../../../shared/ai-settings';
import {
	AppLabel,
	AppSelect,
	AppSelectContent,
	AppSelectItem,
	AppSelectTrigger,
	AppSelectValue,
} from '@/components/app';

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
	const [providers, setProviders] = useState<string[]>([]);
	const [selectedProviders, setSelectedProviders] = useState<Record<string, string>>({});

	const fallbackProvider = useMemo(() => providers[0] ?? '', [providers]);

	useEffect(() => {
		let active = true;

		async function loadProviders() {
			if (typeof window.app?.getProviders !== 'function') return;
			try {
				const entries = await window.app.getProviders();
				if (!active) return;

				const uniqueProviders = Array.from(
					new Set(
						entries
							.map((entry) => entry.name.trim())
							.filter((providerName) => providerName.length > 0)
					)
				).sort((a, b) => a.localeCompare(b));

				setProviders(uniqueProviders);
			} catch {
				if (!active) return;
				setProviders([]);
			}
		}

		void loadProviders();

		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		setSelectedProviders((prev) => {
			const next = { ...prev };
			for (const agent of DEFAULT_AGENTS) {
				const current = next[agent.name];
				if (!current || !providers.includes(current)) {
					next[agent.name] = fallbackProvider;
				}
			}
			return next;
		});
	}, [fallbackProvider, providers]);

	const handleProviderChange = useCallback((agentName: string, providerName: string) => {
		setSelectedProviders((prev) => ({
			...prev,
			[agentName]: providerName,
		}));
	}, []);

	return (
		<div className="w-full max-w-2xl p-6">
			<h1 className="text-lg font-normal mb-6">{t('settings.agents.title')}</h1>

			{DEFAULT_AGENTS.map((agent) => (
				<React.Fragment key={agent.name}>
					<SectionHeader title={agent.name} />
					<p className="text-sm text-muted-foreground">{agent.description}</p>
					<div className="mt-3 mb-1">
						<AppLabel className="text-xs font-medium">
							{t('settings.agents.providerLabel', 'Provider')}
						</AppLabel>
						<AppSelect
							value={selectedProviders[agent.name] ?? ''}
							onValueChange={(value) => handleProviderChange(agent.name, value)}
							disabled={providers.length === 0}
						>
							<AppSelectTrigger className="mt-1 h-9 text-sm">
								<AppSelectValue
									placeholder={t('settings.agents.noProviders', 'No providers configured')}
								/>
							</AppSelectTrigger>
							<AppSelectContent>
								{providers.map((provider) => (
									<AppSelectItem key={`${agent.name}-${provider}`} value={provider}>
										{provider}
									</AppSelectItem>
								))}
							</AppSelectContent>
						</AppSelect>
					</div>
				</React.Fragment>
			))}
		</div>
	);
};

export default AgentsSettingsPage;
