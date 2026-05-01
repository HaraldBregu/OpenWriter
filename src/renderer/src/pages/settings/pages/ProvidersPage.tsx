import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProviderId, Service } from '../../../../../shared/types';
import { PROVIDER_IDS, PROVIDER_CATALOGUE, getProvider } from '../../../../../shared/providers';
import { Button } from '@/components/ui/Button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/Field';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/InputGroup';
import { Spinner } from '@/components/ui/Spinner';
import { SectionHeader } from '../components';

const PROVIDER_LABELS = PROVIDER_IDS.reduce<Record<ProviderId, string>>(
	(acc, id) => {
		acc[id] = PROVIDER_CATALOGUE.find((p) => p.id === id)?.name ?? id;
		return acc;
	},
	{} as Record<ProviderId, string>
);

const buildKeyMap = (services: ReadonlyArray<Service & { id: string }>) => {
	const map = {} as Record<ProviderId, string>;
	for (const id of PROVIDER_IDS) {
		map[id] = services.find((s) => s.provider.id === id)?.apiKey ?? '';
	}
	return map;
};

const ProvidersPage: React.FC = () => {
	const { t } = useTranslation();
	const [services, setServices] = useState<Array<Service & { id: string }>>([]);
	const [drafts, setDrafts] = useState<Record<ProviderId, string>>(
		() => buildKeyMap([])
	);
	const [saving, setSaving] = useState<ReadonlySet<ProviderId>>(() => new Set());

	const existingKeys = useMemo(() => buildKeyMap(services), [services]);

	const loadServices = useCallback(async () => {
		const loaded = await window.app.getServices();
		setServices(loaded);
		return loaded;
	}, []);

	useEffect(() => {
		loadServices().catch(() => setServices([]));
	}, [loadServices]);

	useEffect(() => {
		setDrafts(existingKeys);
	}, [existingKeys]);

	const handleSubmit = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			const dirty = PROVIDER_IDS.filter((id) => {
				const next = (drafts[id] ?? '').trim();
				return next.length > 0 && next !== existingKeys[id];
			});
			if (dirty.length === 0) return;

			setSaving(new Set(dirty));
			try {
				await Promise.all(
					dirty.map(async (providerId) => {
						const provider = getProvider(providerId);
						if (!provider) return;
						const apiKey = drafts[providerId].trim();
						const added = await window.app.addService({ provider, apiKey });
						const stale = services.filter(
							(entry) => entry.provider.id === providerId && entry.id !== added.id
						);
						await Promise.all(stale.map((entry) => window.app.deleteService(entry.id)));
					})
				);
				await loadServices();
			} finally {
				setSaving(new Set());
			}
		},
		[drafts, existingKeys, loadServices, services]
	);

	const handleReset = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			setDrafts(existingKeys);
		},
		[existingKeys]
	);

	return (
		<div className="w-full max-w-2xl">
			<h1 className="text-lg font-normal mb-6">{t('settings.providers.title', 'Providers')}</h1>
			<p className="text-sm text-muted-foreground -mt-4 mb-6">
				{t(
					'models.defaultProviders.subtitle',
					'Configure API keys for the most important providers.'
				)}
			</p>

			<SectionHeader title={t('settings.providers.llm', 'LLM Providers')} />

			<form onSubmit={handleSubmit} onReset={handleReset}>
				<FieldGroup>
					{PROVIDER_IDS.map((providerId) => {
						const isSaving = saving.has(providerId);
						return (
							<Field key={providerId}>
								<FieldLabel htmlFor={`provider-${providerId}`}>
									{PROVIDER_LABELS[providerId]}
								</FieldLabel>
								<InputGroup>
									<InputGroupInput
										id={`provider-${providerId}`}
										type="password"
										value={drafts[providerId] ?? ''}
										onChange={(e) =>
											setDrafts((prev) => ({
												...prev,
												[providerId]: e.target.value,
											}))
										}
										placeholder={t('models.form.apiKeyPlaceholder', 'Enter API key…')}
										autoComplete="off"
										spellCheck={false}
										disabled={isSaving}
									/>
									{isSaving && (
										<InputGroupAddon align="inline-end">
											<Spinner />
										</InputGroupAddon>
									)}
								</InputGroup>
							</Field>
						);
					})}

					<Field orientation="horizontal">
						<Button type="reset" variant="outline">
							{t('common.reset', 'Reset')}
						</Button>
						<Button type="submit">{t('common.submit', 'Submit')}</Button>
					</Field>
				</FieldGroup>
			</form>
		</div>
	);
};

export default ProvidersPage;
