import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/Select';
import { SectionHeader, SettingRow } from '../components';
import {
	DEFAULT_IMAGE_MODEL_ID,
	DEFAULT_TEXT_MODEL_ID,
	IMAGE_MODELS,
	TEXT_MODELS,
} from '../../../../../shared/models';
import { getProvider } from '../../../../../shared/providers';
import type { AgentSettings, ModelInfo } from '../../../../../shared/types';

type SaveStatus =
	| { type: 'idle' }
	| { type: 'loading' }
	| { type: 'saving' }
	| { type: 'saved' }
	| { type: 'error'; message: string };

const ASSISTANT_AGENT_ID = 'assistant';

const DEFAULT_ASSISTANT_AGENT: AgentSettings = {
	id: ASSISTANT_AGENT_ID,
	name: 'Assistant Agent',
	models: {
		text: DEFAULT_TEXT_MODEL_ID,
		image: DEFAULT_IMAGE_MODEL_ID,
	},
};

function modelLabel(model: ModelInfo): string {
	const providerName = getProvider(model.providerId)?.name ?? model.providerId;
	return `${model.name} (${providerName})`;
}

function AgentModelSelect({
	label,
	value,
	models,
	disabled,
	onChange,
}: {
	readonly label: string;
	readonly value: string;
	readonly models: readonly ModelInfo[];
	readonly disabled: boolean;
	readonly onChange: (modelId: string) => void;
}): React.JSX.Element {
	return (
		<Select value={value} onValueChange={(next) => next && onChange(next)} disabled={disabled}>
			<SelectTrigger className="h-8 w-64 text-sm" aria-label={label}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent className="w-72">
				{models.map((model) => (
					<SelectItem key={model.modelId} value={model.modelId}>
						{modelLabel(model)}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function normalizeAssistantAgent(agent?: AgentSettings): AgentSettings {
	return {
		...(agent ?? DEFAULT_ASSISTANT_AGENT),
		id: ASSISTANT_AGENT_ID,
		name: agent?.name || DEFAULT_ASSISTANT_AGENT.name,
		models: {
			text: agent?.models.text ?? DEFAULT_TEXT_MODEL_ID,
			image: agent?.models.image ?? DEFAULT_IMAGE_MODEL_ID,
		},
	};
}

const AgentsPage: React.FC = () => {
	const { t } = useTranslation();
	const [assistantAgent, setAssistantAgent] = useState<AgentSettings>(DEFAULT_ASSISTANT_AGENT);
	const [status, setStatus] = useState<SaveStatus>({ type: 'loading' });

	useEffect(() => {
		let isMounted = true;

		const loadAgents = async () => {
			try {
				const agents = await window.app.getAgents();
				const assistant = normalizeAssistantAgent(
					agents.find((agent) => agent.id === ASSISTANT_AGENT_ID)
				);

				if (isMounted) {
					setAssistantAgent(assistant);
					setStatus({ type: 'idle' });
				}
			} catch (error) {
				if (isMounted) {
					setStatus({
						type: 'error',
						message:
							error instanceof Error
								? error.message
								: t('settings.agents.loadError', 'Unable to load agent settings.'),
					});
				}
			}
		};

		void loadAgents();

		return () => {
			isMounted = false;
		};
	}, [t]);

	const updateModel = async (role: 'text' | 'image', modelId: string) => {
		const nextAgent = {
			...assistantAgent,
			models: {
				...assistantAgent.models,
				[role]: modelId,
			},
		};

		setAssistantAgent(nextAgent);
		setStatus({ type: 'saving' });

		try {
			const saved = await window.app.updateAgent(nextAgent);
			setAssistantAgent(normalizeAssistantAgent(saved));
			setStatus({ type: 'saved' });
		} catch (error) {
			setStatus({
				type: 'error',
				message:
					error instanceof Error
						? error.message
						: t('settings.agents.saveError', 'Unable to save agent settings.'),
			});
		}
	};

	const isBusy = status.type === 'loading' || status.type === 'saving';
	const textModel = assistantAgent.models.text ?? DEFAULT_TEXT_MODEL_ID;
	const imageModel = assistantAgent.models.image ?? DEFAULT_IMAGE_MODEL_ID;

	return (
		<div className="w-full max-w-2xl p-4 sm:p-6">
			<h1 className="text-lg font-normal mb-1">{t('settings.agents.title', 'Agents')}</h1>
			<p className="text-sm text-muted-foreground mb-6">
				{t(
					'settings.agents.subtitle',
					'Configure the model assignments each agent uses for its work.'
				)}
			</p>

			<SectionHeader title={assistantAgent.name} />

			<SettingRow
				label={t('settings.agents.textModel', 'Text generation')}
				description={t(
					'settings.agents.textModelDescription',
					'Used by the assistant for writing, chat, reasoning, and document edits.'
				)}
			>
				<AgentModelSelect
					label={t('settings.agents.textModel', 'Text generation')}
					value={textModel}
					models={TEXT_MODELS}
					disabled={isBusy}
					onChange={(modelId) => void updateModel('text', modelId)}
				/>
			</SettingRow>

			<SettingRow
				label={t('settings.agents.imageModel', 'Image generation')}
				description={t(
					'settings.agents.imageModelDescription',
					'Used by the assistant when image generation tools are available.'
				)}
			>
				<AgentModelSelect
					label={t('settings.agents.imageModel', 'Image generation')}
					value={imageModel}
					models={IMAGE_MODELS}
					disabled={isBusy}
					onChange={(modelId) => void updateModel('image', modelId)}
				/>
			</SettingRow>

			<div className="min-h-5 pt-3 text-xs text-muted-foreground">
				{status.type === 'saving' && t('settings.agents.saving', 'Saving...')}
				{status.type === 'saved' && t('settings.agents.saved', 'Saved')}
				{status.type === 'error' && <span className="text-destructive">{status.message}</span>}
			</div>
		</div>
	);
};

export default AgentsPage;
