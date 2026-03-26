import React, { useState, useCallback, useId, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Cpu, Eye, EyeOff, Star, Trash2 } from 'lucide-react';
import {
	DEFAULT_MODELS,
	type CreateModelInput,
	type ModelConfig,
} from '../../../../shared/model-defaults';
import {
	AppButton,
	AppInput,
	AppLabel,
	AppBadge,
	AppSeparator,
	AppSelect,
	AppSelectTrigger,
	AppSelectValue,
	AppSelectContent,
	AppSelectItem,
} from '../../components/app';

type Provider = (typeof DEFAULT_MODELS)[number]['provider'];

const PROVIDERS = Array.from(new Set(DEFAULT_MODELS.map((entry) => entry.provider))) as Provider[];

const PROVIDER_LABELS: Record<Provider, string> = {
	anthropic: 'Anthropic',
	openai: 'OpenAI',
	google: 'Google',
	mistral: 'Mistral',
};

interface FormState {
	provider: Provider | '';
	apikey: string;
	baseurl: string;
}

const EMPTY_FORM: FormState = {
	provider: '',
	apikey: '',
	baseurl: '',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function maskApiKey(key: string): string {
	if (key.length === 0) return '—';
	if (key.length <= 4) return '••••';
	return `${key.slice(0, 3)}${'•'.repeat(8)}${key.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

const ModelsEmptyState: React.FC = () => {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col items-center justify-center gap-4 text-center px-6 py-12">
			<div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
				<Cpu className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
			</div>
			<div className="space-y-1 max-w-xs">
				<p className="text-sm font-medium text-foreground">
					{t('models.emptyTitle', 'No models registered')}
				</p>
				<p className="text-xs text-muted-foreground">
					{t('models.emptyDescription', 'Register a model to make it available in your workspace.')}
				</p>
			</div>
		</div>
	);
};

// ---------------------------------------------------------------------------
// Model row
// ---------------------------------------------------------------------------

interface ModelRowProps {
	entry: ModelConfig;
	onDelete: (id: string) => void;
}

const ModelRow: React.FC<ModelRowProps> = ({ entry, onDelete }) => {
	const { t } = useTranslation();

	const handleDelete = useCallback(() => {
		onDelete(entry.id);
	}, [onDelete, entry.id]);

	return (
		<div className="flex items-center gap-3 py-2.5 px-1">
			<AppBadge variant="secondary" className="shrink-0 text-xs font-medium">
				{entry.provider}
			</AppBadge>
			{entry.apikey.length > 0 && (
				<span className="font-mono text-xs text-muted-foreground shrink-0">
					{maskApiKey(entry.apikey)}
				</span>
			)}
			{entry.baseurl.length > 0 && (
				<span
					className="text-xs text-muted-foreground truncate max-w-[140px]"
					title={entry.baseurl}
				>
					{entry.baseurl}
				</span>
			)}
			<AppButton
				type="button"
				variant="ghost"
				size="icon-xs"
				aria-label={t('models.deleteModel', 'Delete model')}
				onClick={handleDelete}
				className="shrink-0 text-muted-foreground hover:text-destructive"
			>
				<Trash2 />
			</AppButton>
		</div>
	);
};

// ---------------------------------------------------------------------------
// Registration form
// ---------------------------------------------------------------------------

interface RegistrationFormProps {
	onRegister: (entry: CreateModelInput) => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onRegister }) => {
	const { t } = useTranslation();
	const uid = useId();
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [apiKeyVisible, setApiKeyVisible] = useState(false);
	const isValid = form.provider !== '';

	const handleProviderChange = useCallback((value: string) => {
		setForm((prev) => ({ ...prev, provider: value as Provider, baseurl: '' }));
	}, []);

	const handleApiKeyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setForm((prev) => ({ ...prev, apikey: e.target.value }));
	}, []);

	const handleBaseUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setForm((prev) => ({ ...prev, baseurl: e.target.value }));
	}, []);

	const handleToggleApiKeyVisibility = useCallback(() => {
		setApiKeyVisible((prev) => !prev);
	}, []);

	const handleSubmit = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			if (!isValid) return;
			onRegister({
				provider: form.provider as Provider,
				apikey: form.apikey,
				baseurl: form.baseurl.trim(),
			});
			setForm(EMPTY_FORM);
			setApiKeyVisible(false);
		},
		[isValid, form, onRegister]
	);

	const toggleVisibilityLabel = apiKeyVisible
		? t('models.hideApiKey', 'Hide API key')
		: t('models.showApiKey', 'Show API key');

	return (
		<form onSubmit={handleSubmit} noValidate>
			<div className="grid grid-cols-2 gap-x-4 gap-y-3">
				<div className="flex flex-col gap-1.5">
					<AppLabel htmlFor={`${uid}-provider`} className="text-xs font-medium">
						{t('models.form.provider', 'Provider')}
					</AppLabel>
					<AppSelect value={form.provider} onValueChange={handleProviderChange}>
						<AppSelectTrigger id={`${uid}-provider`} className="h-9 text-sm">
							<AppSelectValue placeholder={t('models.form.selectProvider', 'Select provider…')} />
						</AppSelectTrigger>
						<AppSelectContent>
							{PROVIDERS.map((p) => (
								<AppSelectItem key={p} value={p} className="text-sm">
									{PROVIDER_LABELS[p]}
								</AppSelectItem>
							))}
						</AppSelectContent>
					</AppSelect>
				</div>

				<div className="flex flex-col gap-1.5">
					<AppLabel htmlFor={`${uid}-apikey`} className="text-xs font-medium">
						{t('models.form.apiKey', 'API Key')}
					</AppLabel>
					<div className="relative flex items-center">
						<AppInput
							id={`${uid}-apikey`}
							type={apiKeyVisible ? 'text' : 'password'}
							value={form.apikey}
							onChange={handleApiKeyChange}
							placeholder={t('models.form.apiKeyPlaceholder', 'Enter API key…')}
							autoComplete="off"
							spellCheck={false}
							className="h-9 text-sm font-mono pr-8"
						/>
						<AppButton
							type="button"
							variant="ghost"
							size="icon-xs"
							aria-label={toggleVisibilityLabel}
							onClick={handleToggleApiKeyVisibility}
							className="absolute right-1.5 text-muted-foreground hover:text-foreground"
						>
							{apiKeyVisible ? <EyeOff /> : <Eye />}
						</AppButton>
					</div>
				</div>

				<div className="flex flex-col gap-1.5">
					<AppLabel htmlFor={`${uid}-baseurl`} className="text-xs font-medium">
						{t('models.form.baseUrl', 'Base URL')}
					</AppLabel>
					<AppInput
						id={`${uid}-baseurl`}
						type="url"
						value={form.baseurl}
						onChange={handleBaseUrlChange}
						placeholder={t('models.form.baseUrlPlaceholder', 'https://api.openai.com/v1')}
						autoComplete="off"
						spellCheck={false}
						className="h-9 text-sm"
					/>
				</div>
			</div>

			<div className="flex justify-end mt-4">
				<AppButton type="submit" size="sm" disabled={!isValid}>
					{t('models.form.save', 'Save')}
				</AppButton>
			</div>
		</form>
	);
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const ModelsPage: React.FC = () => {
	const { t } = useTranslation();
	const [models, setModels] = useState<ModelConfig[]>([]);
	const [loading, setLoading] = useState(true);

	const loadModels = useCallback(() => {
		return window.app.getModels().then((loaded) => {
			setModels(loaded);
			return loaded;
		});
	}, []);

	useEffect(() => {
		loadModels()
			.catch(() => {
				setModels([]);
			})
			.finally(() => {
				setLoading(false);
			});
	}, [loadModels]);

	const handleRegister = useCallback(
		(entry: CreateModelInput) => {
			window.app
				.addModel(entry)
				.then(() => {
					return loadModels();
				})
				.catch(() => {
					// Addition failed — no local state update
				});
		},
		[loadModels]
	);

	const handleDelete = useCallback(
		(id: string) => {
			window.app
				.deleteModel(id)
				.then(() => {
					return loadModels();
				})
				.catch(() => {
					// Deletion failed — keep existing state
				});
		},
		[loadModels]
	);

	const handleSetDefault = useCallback(
		(id: string) => {
			window.app
				.setDefaultModel(id)
				.then(() => {
					return loadModels();
				})
				.catch(() => {
					// Update failed — keep existing state
				});
		},
		[loadModels]
	);

	return (
		<div className="flex flex-col h-full">
			<div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
				<div>
					<h1 className="text-sm font-semibold text-foreground">{t('models.title', 'Models')}</h1>
					<p className="text-xs text-muted-foreground mt-0.5">
						{t('models.subtitle', 'Manage the AI models registered in your workspace.')}
					</p>
				</div>
			</div>

			<div className="flex-1 min-h-0 overflow-y-auto">
				<div className="px-6 py-5">
					<RegistrationForm onRegister={handleRegister} />
				</div>

				<AppSeparator />

				<div className="px-6 py-2 flex flex-col">
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<p className="text-xs text-muted-foreground">
								{t('models.loading', 'Loading models…')}
							</p>
						</div>
					) : models.length === 0 ? (
						<ModelsEmptyState />
					) : (
						<div className="divide-y divide-border">
							{models.map((m) => (
								<ModelRow
									key={m.id}
									entry={m}
									onDelete={handleDelete}
									onSetDefault={handleSetDefault}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ModelsPage;
