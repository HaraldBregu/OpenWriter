import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useProvidersContext } from '../Provider';

export default function OpenAIPage(): ReactElement {
	const { t } = useTranslation();
	const { drafts, persisted, saving, patchDraft, handleSave } = useProvidersContext();

	const draft = drafts.openai;
	const persistedDraft = persisted.openai;
	const isSaving = saving.has('openai');
	const isDirty = draft.apiKey.trim() !== persistedDraft.apiKey;

	return (
		<form
			className="w-full max-w-lg flex flex-col gap-6"
			onSubmit={(e) => {
				e.preventDefault();
				void handleSave('openai');
			}}
		>
			<div className="flex flex-col gap-1.5">
				<h2 className="text-lg font-semibold">{t('providers.openai', 'OpenAI')}</h2>
				<p className="text-sm text-muted-foreground">
					{t(
						'providers.openaiDescription',
						'Configure your OpenAI API key to use GPT models.'
					)}
				</p>
			</div>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="provider-openai-key">
						{t('providers.apiKey', 'API key')}
					</FieldLabel>
					<Input
						id="provider-openai-key"
						type="password"
						value={draft.apiKey}
						onChange={(e) => patchDraft('openai', { apiKey: e.target.value })}
						placeholder={t('models.form.apiKeyPlaceholder', 'Enter API key…')}
						autoComplete="off"
						spellCheck={false}
						disabled={isSaving}
						required
					/>
					<FieldDescription>
						{t(
							'providers.apiKeyDescription',
							'Stored encrypted in your OS keychain.'
						)}
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
