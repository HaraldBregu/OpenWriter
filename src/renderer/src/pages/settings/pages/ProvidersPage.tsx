import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProviderId, Service } from '../../../../../shared/types';
import { PROVIDER_IDS, PROVIDER_CATALOGUE, getProvider } from '../../../../../shared/providers';
import { Button } from '@/components/ui/Button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/Field';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/InputGroup';
import { Spinner } from '@/components/ui/Spinner';
import {
	PageBody,
	PageContainer,
	PageHeader,
	PageHeaderDescription,
	PageHeaderTitle,
} from '@/components/app/base/page';

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
	const [drafts, setDrafts] = useState<Record<ProviderId, string>>(() => buildKeyMap([]));
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

	const handleSaveOne = useCallback(
		async (providerId: ProviderId) => {
			const apiKey = (drafts[providerId] ?? '').trim();
			if (apiKey.length === 0 || apiKey === existingKeys[providerId]) return;

			const provider = getProvider(providerId);
			if (!provider) return;

			setSaving((prev) => {
				const next = new Set(prev);
				next.add(providerId);
				return next;
			});
			try {
				const added = await window.app.addService({ provider, apiKey });
				const stale = services.filter(
					(entry) => entry.provider.id === providerId && entry.id !== added.id
				);
				await Promise.all(stale.map((entry) => window.app.deleteService(entry.id)));
				await loadServices();
			} finally {
				setSaving((prev) => {
					const next = new Set(prev);
					next.delete(providerId);
					return next;
				});
			}
		},
		[drafts, existingKeys, loadServices, services]
	);

	const handleResetOne = useCallback(
		(providerId: ProviderId) => {
			setDrafts((prev) => ({ ...prev, [providerId]: existingKeys[providerId] }));
		},
		[existingKeys]
	);

	return (
		<PageContainer>
			<PageHeader>
				<PageHeaderTitle>{t('settings.providers.title', 'Providers')}</PageHeaderTitle>
				<PageHeaderDescription>
					{t(
						'models.defaultProviders.subtitle',
						'Configure API keys for the most important providers.'
					)}
				</PageHeaderDescription>
			</PageHeader>
			<PageBody>
				<FieldGroup className="max-w-2xl">
				{PROVIDER_IDS.map((providerId) => {
					const isSaving = saving.has(providerId);
					const draftValue = drafts[providerId] ?? '';
					const isDirty = draftValue.trim() !== existingKeys[providerId];

					return (
						<form
							key={providerId}
							onSubmit={(e) => {
								e.preventDefault();
								void handleSaveOne(providerId);
							}}
							onReset={(e) => {
								e.preventDefault();
								handleResetOne(providerId);
							}}
						>
							<Field>
								<FieldLabel htmlFor={`provider-${providerId}`}>
									{PROVIDER_LABELS[providerId]}
								</FieldLabel>
								<InputGroup>
									<InputGroupInput
										id={`provider-${providerId}`}
										type="password"
										value={draftValue}
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
								<Field orientation="horizontal" className="justify-end">
									<Button
										type="reset"
										variant="outline"
										disabled={!isDirty || isSaving}
									>
										{t('common.reset', 'Reset')}
									</Button>
									<Button type="submit" disabled={!isDirty || isSaving}>
										{t('common.submit', 'Submit')}
									</Button>
								</Field>
							</Field>
						</form>
					);
				})}
				</FieldGroup>
			</PageBody>
		</PageContainer>
	);
};

export default ProvidersPage;
