import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import type { Provider, ProviderId } from '../../../../../shared/types';
import { PROVIDER_IDS, PROVIDER_CATALOGUE, getProvider } from '../../../../../shared/providers';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
	ItemRow,
	ItemRowActions,
	ItemRowContent,
	ItemRowTitle,
} from '@/components/ui/ItemRow';
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

const buildKeyMap = (providers: ReadonlyArray<Provider>) => {
	const map = {} as Record<ProviderId, string>;
	for (const id of PROVIDER_IDS) {
		map[id] = providers.find((p) => p.id === id)?.apiKey ?? '';
	}
	return map;
};

const ProvidersPage: React.FC = () => {
	const { t } = useTranslation();
	const [providers, setProviders] = useState<Provider[]>([]);
	const [drafts, setDrafts] = useState<Record<ProviderId, string>>(() => buildKeyMap([]));
	const [saving, setSaving] = useState<ReadonlySet<ProviderId>>(() => new Set());

	const existingKeys = useMemo(() => buildKeyMap(providers), [providers]);

	const loadProviders = useCallback(async () => {
		const loaded = await window.app.getProviders();
		setProviders(loaded);
		return loaded;
	}, []);

	useEffect(() => {
		loadProviders().catch(() => setProviders([]));
	}, [loadProviders]);

	useEffect(() => {
		setDrafts(existingKeys);
	}, [existingKeys]);

	const handleSaveOne = useCallback(
		async (providerId: ProviderId) => {
			const apiKey = (drafts[providerId] ?? '').trim();
			if (apiKey.length === 0 || apiKey === existingKeys[providerId]) return;

			const catalog = getProvider(providerId);
			if (!catalog) return;

			setSaving((prev) => {
				const next = new Set(prev);
				next.add(providerId);
				return next;
			});
			try {
				await window.app.addProvider({ id: catalog.id, name: catalog.name, apiKey });
				await loadProviders();
			} finally {
				setSaving((prev) => {
					const next = new Set(prev);
					next.delete(providerId);
					return next;
				});
			}
		},
		[drafts, existingKeys, loadProviders]
	);

	return (
		<PageContainer>
			<PageHeader className="px-0 border-none">
				<PageHeaderTitle>{t('settings.providers.title', 'Providers')}</PageHeaderTitle>
				<PageHeaderDescription>
					{t(
						'models.defaultProviders.subtitle',
						'Configure API keys for the most important providers.'
					)}
				</PageHeaderDescription>
			</PageHeader>
			<PageBody className="px-0">
				<div className="flex flex-col gap-2 max-w-2xl">
					{PROVIDER_IDS.map((providerId) => {
						const isSaving = saving.has(providerId);
						const draftValue = drafts[providerId] ?? '';
						const isDirty = draftValue.trim() !== existingKeys[providerId];

						return (
							<ItemRow key={providerId} variant="bottom-bordered" size="none">
								<ItemRowContent>
									<ItemRowTitle>
										<label htmlFor={`provider-${providerId}`}>
											{PROVIDER_LABELS[providerId]}
										</label>
									</ItemRowTitle>
								</ItemRowContent>
								<ItemRowActions>
									<form
										className="flex items-center gap-2"
										onSubmit={(e) => {
											e.preventDefault();
											void handleSaveOne(providerId);
										}}
									>
										<Input
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
											className="h-8 w-56 text-sm"
										/>
										<Button
											type="submit"
											size="icon"
											disabled={!isDirty || isSaving}
											aria-label={t('common.save', 'Save')}
										>
											{isSaving ? <Spinner /> : <Save />}
										</Button>
									</form>
								</ItemRowActions>
							</ItemRow>
						);
					})}
				</div>
			</PageBody>
		</PageContainer>
	);
};

export default ProvidersPage;
