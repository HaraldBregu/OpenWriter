import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/Select';
import { PROVIDERS } from '../../../../../shared/types';
import type { ProviderId } from '../../../../../shared/types';
import { AGENT_DEFINITIONS } from '../../../../../shared/agents';
import { useAgentsContext } from '../Provider';

const DEFINITION = AGENT_DEFINITIONS.find((d) => d.id === 'image-creator')!;

export default function ImageCreatorPage(): ReactElement {
	const { t } = useTranslation();
	const {
		agentsById,
		modelsCache,
		loadingByProvider,
		errorByProvider,
		saving,
		saved,
		loadStatus,
		handleProviderChange,
		handleModelChange,
	} = useAgentsContext();

	const agent = agentsById[DEFINITION.id] ?? { id: DEFINITION.id, name: DEFINITION.name, models: [] };
	const firstModel = agent.models[0];
	const providerId = firstModel?.providerId ?? '';
	const modelId = firstModel?.modelId ?? '';
	const availableModels = providerId ? (modelsCache[providerId] ?? []) : [];
	const isLoadingModels = providerId ? Boolean(loadingByProvider[providerId]) : false;
	const providerError = providerId ? errorByProvider[providerId] : null;
	const isBusy = loadStatus.type === 'loading';
	const isSaving = saving.has(DEFINITION.id);
	const isSaved = saved.has(DEFINITION.id);

	return (
		<Card>
			<CardHeader>
				<CardTitle>{DEFINITION.name}</CardTitle>
				<CardDescription>{DEFINITION.description}</CardDescription>
				{(isSaving || isSaved) && (
					<CardAction>
						<span className="text-xs text-muted-foreground">
							{isSaving
								? t('settings.agents.saving', 'Saving...')
								: t('settings.agents.saved', 'Saved')}
						</span>
					</CardAction>
				)}
			</CardHeader>
			<CardContent>
				<div className="flex flex-col gap-6">
					<div className="grid gap-2">
						<Label htmlFor="agent-image-creator-provider">
							{t('settings.agents.provider', 'Provider')}
						</Label>
						<Select
							value={providerId}
							onValueChange={(next) =>
								next && void handleProviderChange(DEFINITION, next as ProviderId)
							}
							disabled={isBusy}
						>
							<SelectTrigger id="agent-image-creator-provider">
								<SelectValue
									placeholder={t('settings.agents.providerPlaceholder', 'Select provider')}
								/>
							</SelectTrigger>
							<SelectContent>
								{PROVIDERS.map((provider) => (
									<SelectItem key={provider.id} value={provider.id}>
										{provider.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{providerId && (
						<div className="grid gap-2">
							<Label htmlFor="agent-image-creator-model">
								{t('settings.agents.model', 'Model')}
							</Label>
							<Select
								value={modelId}
								onValueChange={(next) => next && void handleModelChange(DEFINITION, next)}
								disabled={isBusy || isLoadingModels || availableModels.length === 0}
							>
								<SelectTrigger id="agent-image-creator-model">
									<SelectValue
										placeholder={
											isLoadingModels
												? t('settings.agents.modelsLoading', 'Loading…')
												: t('settings.agents.modelPlaceholder', 'Select model')
										}
									/>
								</SelectTrigger>
								<SelectContent>
									{availableModels.map((model) => (
										<SelectItem key={model.id} value={model.id}>
											{model.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
					{providerError && <p className="text-sm text-destructive">{providerError}</p>}
				</div>
			</CardContent>
		</Card>
	);
}
