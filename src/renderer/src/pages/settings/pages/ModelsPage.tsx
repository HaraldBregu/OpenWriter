import React, { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { SectionHeader } from '../components';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/Collapsible';
import { Input } from '@/components/ui/Input';
import { AI_MODELS } from '../../../../../shared/models';
import type { AppProviderName, ModelInfo } from '../../../../../shared/types';

function formatTokens(value: number | null): string {
	if (value === null) return 'N/A';
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}K`;
	return String(value);
}

function ModelRow({ model }: { readonly model: ModelInfo }): React.JSX.Element {
	return (
		<Collapsible className="border-b last:border-b-0">
			<CollapsibleTrigger className="flex w-full items-center justify-between py-3 text-left hover:bg-accent/30 transition-colors rounded-sm px-1 group">
				<div className="min-w-0 mr-4">
					<p className="text-sm">{model.name}</p>
					<p className="text-xs text-muted-foreground mt-0.5">{model.modelId}</p>
				</div>
				<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-90" />
			</CollapsibleTrigger>
			<CollapsibleContent className="px-1 pb-3">
				<div className="rounded-md border bg-muted/30 p-3 space-y-2">
					<DetailRow label="Model ID" value={model.modelId} mono />
					<DetailRow label="Provider" value={model.provider} />
					<DetailRow label="Type" value={model.type} />
					<DetailRow label="Context Window" value={formatTokens(model.contextWindow)} />
					<DetailRow label="Max Output Tokens" value={formatTokens(model.maxOutputTokens)} />
					{model.knowledgeCutoff && (
						<DetailRow label="Knowledge Cutoff" value={model.knowledgeCutoff} />
					)}
					{model.inputPricePerMillionTokens !== undefined && (
						<DetailRow
							label="Input Price"
							value={`$${model.inputPricePerMillionTokens} / 1M tokens`}
						/>
					)}
					{model.cachedInputPricePerMillionTokens !== undefined && (
						<DetailRow
							label="Cached Input Price"
							value={`$${model.cachedInputPricePerMillionTokens} / 1M tokens`}
						/>
					)}
					{model.outputPricePerMillionTokens !== undefined && (
						<DetailRow
							label="Output Price"
							value={
								typeof model.outputPricePerMillionTokens === 'number'
									? `$${model.outputPricePerMillionTokens} / 1M tokens`
									: 'Variable'
							}
						/>
					)}
					{model.features && model.features.length > 0 && (
						<div className="flex items-start justify-between gap-4">
							<p className="text-xs text-muted-foreground shrink-0">Features</p>
							<div className="flex flex-wrap gap-1 justify-end">
								{model.features.map((feature) => (
									<span
										key={feature}
										className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
									>
										{feature.replace(/_/g, ' ')}
									</span>
								))}
							</div>
						</div>
					)}
					{model.reasoningLevels && model.reasoningLevels.length > 0 && (
						<div className="flex items-start justify-between gap-4">
							<p className="text-xs text-muted-foreground shrink-0">Reasoning Levels</p>
							<p className="text-xs text-right">{model.reasoningLevels.join(', ')}</p>
						</div>
					)}
					{model.toolsSupported && model.toolsSupported.length > 0 && (
						<div className="flex items-start justify-between gap-4">
							<p className="text-xs text-muted-foreground shrink-0">Tools Supported</p>
							<div className="flex flex-wrap gap-1 justify-end">
								{model.toolsSupported.map((tool) => (
									<span
										key={tool}
										className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
									>
										{tool.replace(/_/g, ' ')}
									</span>
								))}
							</div>
						</div>
					)}
					{model.endpoints && model.endpoints.length > 0 && (
						<DetailRow label="Endpoints" value={model.endpoints.join(', ')} />
					)}
					{model.snapshots && model.snapshots.length > 0 && (
						<DetailRow label="Snapshots" value={model.snapshots.join(', ')} />
					)}
					{model.rateLimits && <DetailRow label="Rate Limits" value={model.rateLimits} />}
					{model.notes && <DetailRow label="Notes" value={model.notes} />}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

function DetailRow({
	label,
	value,
	mono,
}: {
	readonly label: string;
	readonly value: string;
	readonly mono?: boolean;
}): React.JSX.Element {
	return (
		<div className="flex items-center justify-between gap-4">
			<p className="text-xs text-muted-foreground shrink-0">{label}</p>
			<p className={`text-xs text-right ${mono ? 'font-mono' : ''}`}>{value}</p>
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
						<ModelRow key={model.modelId} model={model} />
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
