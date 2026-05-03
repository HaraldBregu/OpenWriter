import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from '@/components/ui/Field';
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

const DEFINITION = AGENT_DEFINITIONS.find((d) => d.id === 'content-writer')!;

export default function ContentWriterPage(): ReactElement {
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
		<FieldGroup className="w-full max-w-lg">
			<FieldSet>
				<FieldLegend>{DEFINITION.name}</FieldLegend>
				<FieldDescription>{DEFINITION.description}</FieldDescription>
				{(isSaving || isSaved) && (
					<Field orientation="horizontal">
						<FieldLabel className="font-normal text-muted-foreground">
							{isSaving
								? t('settings.agents.saving', 'Saving...')
								: t('settings.agents.saved', 'Saved')}
						</FieldLabel>
					</Field>
				)}
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="agent-content-writer-provider">
							{t('settings.agents.provider', 'Provider')}
						</FieldLabel>
						<Select
							value={providerId}
							onValueChange={(next) =>
								next && void handleProviderChange(DEFINITION, next as ProviderId)
							}
							disabled={isBusy}
						>
							<SelectTrigger id="agent-content-writer-provider">
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
							<FieldLabel htmlFor="agent-content-writer-model">
								{t('settings.agents.model', 'Model')}
							</FieldLabel>
							<Select
								value={modelId}
								onValueChange={(next) => next && void handleModelChange(DEFINITION, next)}
								disabled={isBusy || isLoadingModels || availableModels.length === 0}
							>
								<SelectTrigger id="agent-content-writer-model">
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
					{providerError && (
						<Field>
							<FieldDescription className="text-destructive">{providerError}</FieldDescription>
						</Field>
					)}
				</FieldGroup>
			</FieldSet>
		</FieldGroup>
	);
}
