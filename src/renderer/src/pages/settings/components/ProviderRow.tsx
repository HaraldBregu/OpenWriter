import React, { useCallback, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import type { ProviderId } from '../../../../../shared/types';
import { PROVIDER_IDS, PROVIDER_CATALOGUE } from '../../../../../shared/providers';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SettingRow } from './SettingRow';

const PROVIDER_LABELS = PROVIDER_IDS.reduce<Record<ProviderId, string>>(
	(acc, providerId) => {
		const label =
			PROVIDER_CATALOGUE.find((provider) => provider.id === providerId)?.name ?? providerId;
		acc[providerId] = label;
		return acc;
	},
	{} as Record<ProviderId, string>
);

const MASKED_API_KEY = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' as const;

interface ProviderRowProps {
	readonly provider: ProviderId;
	readonly existingKey: string;
	readonly onSave: (provider: ProviderId, apiKey: string) => Promise<void>;
}

export const ProviderRow: React.FC<ProviderRowProps> = ({ provider, existingKey, onSave }) => {
	const { t } = useTranslation();
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState('');
	const [saving, setSaving] = useState(false);
	const inputId = useId();

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
		<SettingRow label={PROVIDER_LABELS[provider]} labelFor={editing ? inputId : undefined}>
			{editing ? (
				<div className="flex items-center gap-1.5">
					<AppInput
						id={inputId}
						type="password"
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						placeholder={t('models.form.apiKeyPlaceholder', 'Enter API key\u2026')}
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
