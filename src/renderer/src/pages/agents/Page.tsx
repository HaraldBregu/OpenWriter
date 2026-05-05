import { useEffect, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
	PageBody,
	PageContainer,
	PageHeader,
	PageHeaderTitle,
} from '@/components/app/base/page';
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from '@/components/ui/Field';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/Select';
import { PROVIDERS } from '../../../../shared/types';
import type { ProviderId } from '../../../../shared/types';
import {
	AGENT_DEFINITIONS,
	AgentsProvider,
	useAgentsContext,
	type AgentDefinition,
} from './Provider';

function Bootstrap(): null {
	const { setAgents, setLoadStatus, ensureModelsLoaded, agentsById, modelsCache } =
		useAgentsContext();

	useEffect(() => {
		let active = true;

		(async () => {
			try {
				const stored = await window.app.getAgents();
				if (!active) return;
				const storedById = new Map(stored.map((a) => [a.id, a]));
				const merged = Object.fromEntries(
					AGENT_DEFINITIONS.map((def) => {
						const existing = storedById.get(def.id);
						return [def.id, existing ?? { id: def.id, name: def.name, models: [] }];
					})
				);
				setAgents(merged);
				setLoadStatus({ type: 'idle' });
			} catch (error) {
				if (!active) return;
				setLoadStatus({
					type: 'error',
					message:
						error instanceof Error ? error.message : 'Unable to load agent settings.',
				});
			}
		})();

		return () => {
			active = false;
		};
	}, [setAgents, setLoadStatus]);

	useEffect(() => {
		const providerIds = new Set<string>();
		Object.values(agentsById).forEach((agent) => {
			agent.models.forEach((m) => {
				if (m.providerId) providerIds.add(m.providerId);
			});
		});
		providerIds.forEach((pid) => {
			if (!modelsCache[pid]) void ensureModelsLoaded(pid);
		});
	}, [agentsById, modelsCache, ensureModelsLoaded]);

	return null;
}

interface AgentFormProps {
	readonly definition: AgentDefinition;
}

function AgentForm({ definition }: AgentFormProps): ReactElement {
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

	const agent = agentsById[definition.id] ?? {
		id: definition.id,
		name: definition.name,
		models: [],
	};
	const firstModel = agent.models[0];
	const providerId = firstModel?.providerId ?? '';
	const modelId = firstModel?.modelId ?? '';
	const availableModels = providerId ? (modelsCache[providerId] ?? []) : [];
	const isLoadingModels = providerId ? Boolean(loadingByProvider[providerId]) : false;
	const providerError = providerId ? errorByProvider[providerId] : null;
	const isBusy = loadStatus.type === 'loading';
	const isSaving = saving.has(definition.id);
	const isSaved = saved.has(definition.id);

	const providerSelectId = `agent-${definition.id}-provider`;
	const modelSelectId = `agent-${definition.id}-model`;

	return (
		<div className="w-full flex flex-col gap-6">
			<div className="flex flex-col gap-1.5">
				<h2 className="text-lg font-semibold">{definition.name}</h2>
				<p className="text-sm text-muted-foreground">{definition.description}</p>
			</div>
			<FieldGroup>
				{(isSaving || isSaved) && (
					<Field orientation="horizontal">
						<FieldLabel className="font-normal text-muted-foreground">
							{isSaving
								? t('settings.agents.saving', 'Saving...')
								: t('settings.agents.saved', 'Saved')}
						</FieldLabel>
					</Field>
				)}
				<Field>
					<FieldLabel htmlFor={providerSelectId}>
						{t('settings.agents.provider', 'Provider')}
					</FieldLabel>
					<Select
						value={providerId}
						onValueChange={(next) =>
							next && void handleProviderChange(definition, next as ProviderId)
						}
						disabled={isBusy}
					>
						<SelectTrigger id={providerSelectId}>
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
						<FieldLabel htmlFor={modelSelectId}>
							{t('settings.agents.model', 'Model')}
						</FieldLabel>
						<Select
							value={modelId}
							onValueChange={(next) => next && void handleModelChange(definition, next)}
							disabled={isBusy || isLoadingModels || availableModels.length === 0}
						>
							<SelectTrigger id={modelSelectId}>
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
		</div>
	);
}

export default function Page(): ReactElement {
	const { t } = useTranslation();

	return (
		<AgentsProvider>
			<Bootstrap />
			<PageContainer>
				<PageHeader>
					<PageHeaderTitle>{t('agents.title', 'Agents')}</PageHeaderTitle>
				</PageHeader>
				<PageBody className="grid grid-cols-1 gap-10 lg:grid-cols-2">
					{AGENT_DEFINITIONS.map((definition) => (
						<AgentForm key={definition.id} definition={definition} />
					))}
				</PageBody>
			</PageContainer>
		</AgentsProvider>
	);
}
