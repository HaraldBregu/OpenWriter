import { useEffect, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import {
	PageBody,
	PageContainer,
	PageHeader,
	PageHeaderTitle,
} from '@/components/app/base/page';
import { Button } from '@/components/ui/Button';
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

	return (
		<form
			className="w-full max-w-lg flex flex-col gap-6"
			onSubmit={(e) => {
				e.preventDefault();
				void handleSave(id);
			}}
		>
			<div className="flex flex-col gap-1.5">
				<h2 className="text-lg font-semibold">{t(`providers.${id}`, provider.name)}</h2>
				<p className="text-sm text-muted-foreground">
					{t(`providers.${id}Description`, '')}
				</p>
			</div>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor={inputId}>{t('providers.apiKey', 'API key')}</FieldLabel>
					<Input
						id={inputId}
						type="password"
						value={draft.apiKey}
						onChange={(e) => patchDraft(id, { apiKey: e.target.value })}
						placeholder={t('models.form.apiKeyPlaceholder', 'Enter API key…')}
						autoComplete="off"
						spellCheck={false}
						disabled={isSaving}
						required
					/>
					<FieldDescription>
						{t('providers.apiKeyDescription', 'Stored encrypted in your OS keychain.')}
					</FieldDescription>
				</Field>
			</FieldGroup>
			<div className="flex justify-end">
				<Button type="submit" disabled={!isDirty || isSaving}>
					{isSaving ? <Spinner /> : <Save />}
					{t('common.save', 'Save')}
				</Button>
			</div>
		</form>
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
