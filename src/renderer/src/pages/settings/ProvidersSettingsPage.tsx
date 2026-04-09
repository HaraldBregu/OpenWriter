import React, { useState, useCallback, useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import type { ProviderId, ServiceProvider } from '../../../../shared/types';
import { PROVIDER_IDS, PROVIDER_CATALOGUE } from '../../../../shared/providers';
import { AppButton, AppInput } from '@/components/app';
import { SettingRow } from './SettingsComponents';

const PROVIDER_LABELS: Record<ProviderId, string> = PROVIDER_IDS.reduce(
	(acc, providerId) => {
		const label =
			PROVIDER_CATALOGUE.find((provider) => provider.id === providerId)?.name ?? providerId;
		acc[providerId] = label;
		return acc;
	},
	{} as Record<ProviderId, string>
);

const MASKED_API_KEY = '••••••••';

interface ProviderRowProps {
	readonly provider: ProviderId;
	readonly existingKey: string;
	readonly onSave: (provider: ProviderId, apiKey: string) => Promise<void>;
}

const ProviderRow: React.FC<ProviderRowProps> = ({ provider, existingKey, onSave }) => {
	const { t } = useTranslation();
	const inputId = useId();
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState('');
	const [saving, setSaving] = useState(false);

	const hasKey = existingKey.length > 0;

	const handleEdit = useCallback(() => {
		setDraft('');
		setEditing(true);
	}, []);

	const handleCancel = useCallback(() => {
		setDraft('');
		setEditing(false);
	}, []);

	const handleConfirm = useCallback(async () => {
		const trimmed = draft.trim();
		if (trimmed.length === 0 || saving) return;

		setSaving(true);
		try {
			await onSave(provider, trimmed);
			setDraft('');
			setEditing(false);
		} catch {
			// Save failed — keep input so user can retry
		} finally {
			setSaving(false);
		}
	}, [draft, onSave, provider, saving]);

	return (
		<SettingRow label={PROVIDER_LABELS[provider]}>
			{editing ? (
				<div className="flex items-center gap-1.5">
					<AppInput
						type="password"
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						placeholder={t('models.form.apiKeyPlaceholder', 'Enter API key…')}
						autoComplete="off"
						spellCheck={false}
						autoFocus
						className="h-7 w-48 text-xs font-mono"
						onKeyDown={(e) => {
							if (e.key === 'Enter') void handleConfirm();
							if (e.key === 'Escape') handleCancel();
						}}
					/>
					<AppButton
						type="button"
						variant="ghost"
						size="icon-xs"
						aria-label={t('models.form.save', 'Save')}
						disabled={draft.trim().length === 0 || saving}
						onClick={() => void handleConfirm()}
					>
						{saving ? <Loader2 className="animate-spin" /> : <Check />}
					</AppButton>
					<AppButton
						type="button"
						variant="ghost"
						size="icon-xs"
						aria-label={t('common.cancel', 'Cancel')}
						disabled={saving}
						onClick={handleCancel}
						className="text-muted-foreground hover:text-destructive"
					>
						<X />
					</AppButton>
				</div>
			) : (
				<div className="flex items-center gap-1.5">
					<span className="text-sm font-mono text-muted-foreground">
						{hasKey ? MASKED_API_KEY : t('models.form.notSet', 'Not set')}
					</span>
					<AppButton
						type="button"
						variant="ghost"
						size="icon-xs"
						aria-label={t('common.edit', 'Edit')}
						onClick={handleEdit}
						className="text-muted-foreground hover:text-foreground"
					>
						<Pencil />
					</AppButton>
				</div>
			)}
		</SettingRow>
	);
};

const ProvidersSettingsPage: React.FC = () => {
	const { t } = useTranslation();
	const [providers, setProviders] = useState<Array<ServiceProvider & { id: string }>>([]);

	const loadProviders = useCallback(async () => {
		const loaded = await window.app.getProviders();
		setProviders(loaded);
		return loaded;
	}, []);

	useEffect(() => {
		loadProviders().catch(() => {
			setProviders([]);
		});
	}, [loadProviders]);

	const handleSave = useCallback(
		async (provider: ProviderId, apiKey: string) => {
			const added = await window.app.addProvider({
				name: provider,
				apikey: apiKey,
				baseurl: '',
			});

			const staleEntries = providers.filter(
				(entry) => entry.name === provider && entry.id !== added.id
			);
			await Promise.all(staleEntries.map((entry) => window.app.deleteProvider(entry.id)));
			await loadProviders();
		},
		[loadProviders, providers]
	);

	return (
		<div className="w-full max-w-2xl p-4 sm:p-6">
			<h1 className="text-lg font-normal mb-6">{t('settings.providers.title', 'Providers')}</h1>
			<p className="text-sm text-muted-foreground -mt-4 mb-6">
				{t(
					'models.defaultProviders.subtitle',
					'Configure API keys for the most important providers.'
				)}
			</p>

			{PROVIDER_IDS.map((provider) => {
				const existingKey = providers.find((m) => m.name === provider)?.apikey ?? '';
				return (
					<ProviderRow
						key={provider}
						provider={provider}
						existingKey={existingKey}
						onSave={handleSave}
					/>
				);
			})}
		</div>
	);
};

export default ProvidersSettingsPage;
