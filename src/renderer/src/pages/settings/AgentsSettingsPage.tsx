import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2 } from 'lucide-react';
import { DEFAULT_AGENTS } from '../../../../shared/ai-settings';
import {
	AppButton,
	AppLabel,
	AppSelect,
	AppSelectContent,
	AppSelectItem,
	AppSelectTrigger,
	AppSelectValue,
} from '@/components/app';

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const AgentsSettingsPage: React.FC = () => {
	const { t } = useTranslation();
	const [providers, setProviders] = useState<string[]>([]);
	const [selectedProviders, setSelectedProviders] = useState<Record<string, string>>({});
	const [savedProviders, setSavedProviders] = useState<Record<string, string>>({});
	const [savingByAgent, setSavingByAgent] = useState<Record<string, boolean>>({});

	const fallbackProvider = useMemo(() => providers[0] ?? '', [providers]);

	useEffect(() => {
		let active = true;

		async function loadProvidersAndSelections() {
			if (
				typeof window.app?.getProviders !== 'function' ||
				typeof window.app?.getAgentProviders !== 'function'
			) {
				return;
			}

			try {
				const [entries, saved] = await Promise.all([
					window.app.getProviders(),
					window.app.getAgentProviders(),
				]);
				if (!active) return;

				const uniqueProviders = Array.from(
					new Set(
						entries
							.map((entry) => entry.name.trim())
							.filter((providerName) => providerName.length > 0)
					)
				).sort((a, b) => a.localeCompare(b));

				setProviders(uniqueProviders);

				const nextSaved: Record<string, string> = {};
				const nextSelected: Record<string, string> = {};
				const defaultProvider = uniqueProviders[0] ?? '';

				for (const agent of DEFAULT_AGENTS) {
					const savedProvider = saved[agent.name];
					const resolvedProvider =
						typeof savedProvider === 'string' && uniqueProviders.includes(savedProvider)
							? savedProvider
							: defaultProvider;
					nextSaved[agent.name] = resolvedProvider;
					nextSelected[agent.name] = resolvedProvider;
				}

				setSavedProviders(nextSaved);
				setSelectedProviders(nextSelected);
			} catch {
				if (!active) return;
				setProviders([]);
				setSavedProviders({});
				setSelectedProviders({});
			}
		}

		void loadProvidersAndSelections();

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

	const handleSaveProvider = useCallback(
		async (agentName: string) => {
			const providerName = selectedProviders[agentName]?.trim() ?? '';
			if (providerName.length === 0 || typeof window.app?.setAgentProvider !== 'function') return;

			setSavingByAgent((prev) => ({ ...prev, [agentName]: true }));
			try {
				await window.app.setAgentProvider(agentName, providerName);
				setSavedProviders((prev) => ({
					...prev,
					[agentName]: providerName,
				}));
			} finally {
				setSavingByAgent((prev) => ({ ...prev, [agentName]: false }));
			}
		},
		[selectedProviders]
	);

	return (
		<div className="w-full max-w-2xl p-4 sm:p-6">
			<h1 className="text-lg font-normal mb-6">{t('settings.agents.title')}</h1>

			<div className="space-y-4">
				{DEFAULT_AGENTS.map((agent) => (
					<div
						key={agent.name}
						className="rounded-lg border border-border bg-card p-4 shadow-sm transition-colors"
					>
						<div className="mb-3">
							<h2 className="text-sm font-medium text-foreground">{agent.name}</h2>
							<p className="mt-1 text-sm text-muted-foreground">{agent.description}</p>
						</div>

						<div>
							<AppLabel className="text-xs font-medium text-muted-foreground">
								{t('settings.agents.providerLabel', 'Provider')}
							</AppLabel>
							<div className="mt-1 flex items-center gap-2">
								<AppSelect
									value={selectedProviders[agent.name] ?? ''}
									onValueChange={(value) => handleProviderChange(agent.name, value)}
									disabled={providers.length === 0}
								>
									<AppSelectTrigger className="h-9 text-sm flex-1">
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
								<AppButton
									type="button"
									variant="ghost"
									size="icon-xs"
									aria-label={t('settings.agents.saveProvider', 'Save provider')}
									disabled={
										providers.length === 0 ||
										!selectedProviders[agent.name] ||
										selectedProviders[agent.name] === savedProviders[agent.name] ||
										Boolean(savingByAgent[agent.name])
									}
									onClick={() => {
										void handleSaveProvider(agent.name);
									}}
								>
									{savingByAgent[agent.name] ? <Loader2 className="animate-spin" /> : <Check />}
								</AppButton>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default AgentsSettingsPage;
