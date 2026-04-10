import React, { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionHeader } from '../components';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { AI_MODELS } from '../../../../../shared/models';
import type { AppProviderName, ModelInfo } from '../../../../../shared/types';

const MODEL_TYPE_COLORS: Record<string, string> = {
	multimodal: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20',
	text: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
	reasoning: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20',
	code: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
	image: 'bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-500/20',
	video: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20',
	audio: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
	embedding: 'bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/20',
};

function formatContextWindow(value: number | null): string {
	if (value === null) return 'N/A';
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}K`;
	return String(value);
}

function formatTokens(value: number | null): string {
	if (value === null) return 'N/A';
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}K`;
	return String(value);
}

function ModelCard({ model }: { readonly model: ModelInfo }): React.JSX.Element {
	const typeColor = MODEL_TYPE_COLORS[model.type] ?? MODEL_TYPE_COLORS.text;

	return (
		<div className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/30">
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium truncate">{model.name}</p>
					<p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
						{model.modelId}
					</p>
				</div>
				<Badge className={`shrink-0 text-[10px] font-medium ${typeColor}`}>{model.type}</Badge>
			</div>

			<div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
				<div>
					<p className="text-[10px] text-muted-foreground uppercase tracking-wide">Context</p>
					<p className="text-xs font-medium">{formatContextWindow(model.contextWindow)}</p>
				</div>
				<div>
					<p className="text-[10px] text-muted-foreground uppercase tracking-wide">Max Output</p>
					<p className="text-xs font-medium">{formatTokens(model.maxOutputTokens)}</p>
				</div>
			</div>

			{model.knowledgeCutoff && (
				<div className="mt-1.5">
					<p className="text-[10px] text-muted-foreground uppercase tracking-wide">Cutoff</p>
					<p className="text-xs font-medium">{model.knowledgeCutoff}</p>
				</div>
			)}

			{model.features && model.features.length > 0 && (
				<div className="mt-2.5 flex flex-wrap gap-1">
					{model.features.map((feature) => (
						<span
							key={feature}
							className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
						>
							{feature.replace(/_/g, ' ')}
						</span>
					))}
				</div>
			)}

			{model.notes && (
				<p className="mt-2 text-[11px] text-muted-foreground italic">{model.notes}</p>
			)}
		</div>
	);
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
				{t(
					'settings.models.subtitle',
					'Browse all available AI models across providers.'
				)}
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
				<div key={provider}>
					<SectionHeader title={`${provider} (${models.length})`} />
					<div className="grid grid-cols-1 gap-3 pb-2 sm:grid-cols-2">
						{models.map((model) => (
							<ModelCard key={model.modelId} model={model} />
						))}
					</div>
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
