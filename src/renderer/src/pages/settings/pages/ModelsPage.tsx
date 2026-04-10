import React, { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionHeader, SettingRow } from '../components';
import { Input } from '@/components/ui/Input';
import { AI_MODELS } from '../../../../../shared/models';
import type { AppProviderName, ModelInfo } from '../../../../../shared/types';

function formatTokens(value: number | null): string {
	if (value === null) return 'N/A';
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}K`;
	return String(value);
}

function buildDescription(model: ModelInfo): string {
	const parts: string[] = [];
	parts.push(`Type: ${model.type}`);
	parts.push(`Context: ${formatTokens(model.contextWindow)}`);
	parts.push(`Max Output: ${formatTokens(model.maxOutputTokens)}`);
	if (model.knowledgeCutoff) parts.push(`Cutoff: ${model.knowledgeCutoff}`);
	if (model.notes) parts.push(model.notes);
	return parts.join(' · ');
}

const ModelsPage: React.FC = () => {
	const { t } = useTranslation();
	const [search, setSearch] = useState('');

	const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setSearch(e.target.value);
	}, []);

	const filteredModels = useMemo(() => {
		const query = search.toLowerCase().trim();
		if (!query) return AI_MODELS as readonly ModelInfo[];
		return (AI_MODELS as readonly ModelInfo[]).filter(
			(m) =>
				m.name.toLowerCase().includes(query) ||
				m.modelId.toLowerCase().includes(query) ||
				m.provider.toLowerCase().includes(query) ||
				m.type.toLowerCase().includes(query)
		);
	}, [search]);

	const groupedByProvider = useMemo(() => {
		const groups = new Map<AppProviderName, ModelInfo[]>();
		for (const model of filteredModels) {
			const list = groups.get(model.provider) ?? [];
			list.push(model);
			groups.set(model.provider, list);
		}
		return groups;
	}, [filteredModels]);

	const totalCount = AI_MODELS.length;
	const filteredCount = filteredModels.length;

	return (
		<div className="w-full max-w-2xl p-4 sm:p-6">
			<h1 className="text-lg font-normal mb-1">{t('settings.models.title', 'Models')}</h1>
			<p className="text-sm text-muted-foreground mb-6">
				{t('settings.models.subtitle', 'Browse all available AI models across providers.')}
			</p>

			<div className="mb-6">
				<Input
					placeholder={t('settings.models.searchPlaceholder', 'Search models...')}
					value={search}
					onChange={handleSearchChange}
					className="max-w-sm"
				/>
				<p className="text-xs text-muted-foreground mt-1.5">
					{search
						? t('settings.models.filteredCount', '{{count}} of {{total}} models', {
								count: filteredCount,
								total: totalCount,
							})
						: t('settings.models.totalCount', '{{count}} models available', {
								count: totalCount,
							})}
				</p>
			</div>

			{Array.from(groupedByProvider.entries()).map(([provider, models]) => (
				<div key={provider} className="mb-8">
					<SectionHeader title={`${provider} (${models.length})`} />
					{models.map((model) => (
						<SettingRow
							key={model.modelId}
							label={model.name}
							description={buildDescription(model)}
						>
							<span className="font-mono text-sm text-muted-foreground">{model.modelId}</span>
						</SettingRow>
					))}
				</div>
			))}

			{groupedByProvider.size === 0 && (
				<p className="text-sm text-muted-foreground py-8 text-center">
					{t('settings.models.noResults', 'No models match your search.')}
				</p>
			)}
		</div>
	);
};

export default ModelsPage;
