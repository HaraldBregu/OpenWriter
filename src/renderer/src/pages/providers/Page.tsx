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
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import type { Provider, ProviderId } from '../../../../shared/types';
import { PROVIDER_CATALOGUE } from '../../../../shared/providers';
import { ProvidersProvider, useProvidersContext } from './Provider';

const AUTOSAVE_DELAY_MS = 600;

function Bootstrap(): null {
	const { setProviders, setDrafts, persisted } = useProvidersContext();

	useEffect(() => {
		let active = true;
		window.app
			.getProviders()
			.then((providers) => {
				if (active) setProviders(providers);
			})
			.catch(() => {
				if (active) setProviders([]);
			});
		return () => {
			active = false;
		};
	}, [setProviders]);

	useEffect(() => {
		setDrafts(persisted);
	}, [persisted, setDrafts]);

	return null;
}

interface ProviderFormProps {
	readonly provider: Provider;
}

function ProviderForm({ provider }: ProviderFormProps): ReactElement {
	const { t } = useTranslation();
	const { drafts, persisted, saving, patchDraft, handleSave } = useProvidersContext();

	const id = provider.id as ProviderId;
	const draft = drafts[id];
	const persistedDraft = persisted[id];
	const isSaving = saving.has(id);
	const isDirty = draft.apiKey.trim() !== persistedDraft.apiKey;
	const inputId = `provider-${id}-key`;

	useEffect(() => {
		if (!isDirty || isSaving) return;
		const timer = setTimeout(() => {
			void handleSave(id);
		}, AUTOSAVE_DELAY_MS);
		return () => clearTimeout(timer);
	}, [draft.apiKey, isDirty, isSaving, handleSave, id]);

	return (
		<div className="w-full flex flex-col gap-6">
			<div className="flex flex-col gap-1.5">
				<h2 className="text-lg font-semibold">{t(`providers.${id}`, provider.name)}</h2>
				<p className="text-sm text-muted-foreground">
					{t(`providers.${id}Description`, '')}
				</p>
			</div>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor={inputId} className="flex items-center gap-2">
						{t('providers.apiKey', 'API key')}
						{isSaving && <Spinner className="size-3" />}
					</FieldLabel>
					<Input
						id={inputId}
						type="password"
						value={draft.apiKey}
						onChange={(e) => patchDraft(id, { apiKey: e.target.value })}
						placeholder={t('models.form.apiKeyPlaceholder', 'Enter API key…')}
						autoComplete="off"
						spellCheck={false}
					/>
					<FieldDescription>
						{t('providers.apiKeyDescription', 'Stored encrypted in your OS keychain.')}
					</FieldDescription>
				</Field>
			</FieldGroup>
		</div>
	);
}

export default function Page(): ReactElement {
	const { t } = useTranslation();

	return (
		<ProvidersProvider>
			<Bootstrap />
			<PageContainer>
				<PageHeader>
					<PageHeaderTitle>{t('providers.title', 'Providers')}</PageHeaderTitle>
				</PageHeader>
				<PageBody className="flex flex-col gap-10">
					{PROVIDER_CATALOGUE.map((provider) => (
						<ProviderForm key={provider.id} provider={provider} />
					))}
				</PageBody>
			</PageContainer>
		</ProvidersProvider>
	);
}
