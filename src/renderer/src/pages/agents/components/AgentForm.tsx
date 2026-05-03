import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { PROVIDERS } from '../../../../../shared/types';
import type { ProviderId } from '../../../../../shared/types';
import type { AgentDefinition } from '../../../../../shared/agents';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/Card';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/Select';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/Field';
import { useAgentsContext } from '../Provider';

interface AgentFormProps {
	readonly definition: AgentDefinition;
}

function defaultAgent(def: AgentDefinition) {
	return { id: def.id, name: def.name, models: [] };
}

export function AgentForm({ definition }: AgentFormProps): ReactElement {
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

	const agent = agentsById[definition.id] ?? defaultAgent(definition);
	const firstModel = agent.models[0];
	const providerId = firstModel?.providerId ?? '';
	const modelId = firstModel?.modelId ?? '';
	const availableModels = providerId ? (modelsCache[providerId] ?? []) : [];
	const isLoadingModels = providerId ? Boolean(loadingByProvider[providerId]) : false;
	const providerError = providerId ? errorByProvider[providerId] : null;
	const isBusy = loadStatus.type === 'loading';
	const isSaving = saving.has(definition.id);
	const isSaved = saved.has(definition.id);

	return (
		<Card>
			<CardHeader className="border-b">
				<CardTitle>{definition.name}</CardTitle>
				<CardDescription>{definition.description}</CardDescription>
			</CardHeader>

			<CardContent>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor={`agent-${definition.id}-provider`}>
							{t('settings.agents.provider', 'Provider')}
						</FieldLabel>
						<Select
							value={providerId}
							onValueChange={(next) =>
								next && void handleProviderChange(definition, next as ProviderId)
							}
							disabled={isBusy}
						>
							<SelectTrigger id={`agent-${definition.id}-provider`} className="h-9 text-sm">
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
					</Field>

					{providerId && (
						<Field>
							<FieldLabel htmlFor={`agent-${definition.id}-model`}>
								{t('settings.agents.model', 'Model')}
							</FieldLabel>
							<Select
								value={modelId}
								onValueChange={(next) => next && void handleModelChange(definition, next)}
								disabled={isBusy || isLoadingModels || availableModels.length === 0}
							>
								<SelectTrigger id={`agent-${definition.id}-model`} className="h-9 text-sm">
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
						</Field>
					)}

					{providerError && <FieldError>{providerError}</FieldError>}
				</FieldGroup>
			</CardContent>

			<CardFooter className="justify-end">
				<span className="text-xs text-muted-foreground">
					{isSaving && t('settings.agents.saving', 'Saving...')}
					{!isSaving && isSaved && t('settings.agents.saved', 'Saved')}
				</span>
			</CardFooter>
		</Card>
	);
}
