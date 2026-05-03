import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/Card';
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useProvidersContext } from '../Provider';

export default function AnthropicPage(): ReactElement {
	const { t } = useTranslation();
	const { drafts, persisted, saving, patchDraft, handleSave } = useProvidersContext();

	const draft = drafts.anthropic;
	const persistedDraft = persisted.anthropic;
	const isSaving = saving.has('anthropic');
	const isDirty = draft.apiKey.trim() !== persistedDraft.apiKey;

	return (
		<form
			className="w-full max-w-lg"
			onSubmit={(e) => {
				e.preventDefault();
				void handleSave('anthropic');
			}}
		>
			<Card>
				<CardHeader>
					<CardTitle>{t('providers.anthropic', 'Anthropic')}</CardTitle>
					<CardDescription>
						{t(
							'providers.anthropicDescription',
							'Configure your Anthropic API key to use Claude models.'
						)}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="provider-anthropic-key">
								{t('providers.apiKey', 'API key')}
							</FieldLabel>
							<Input
								id="provider-anthropic-key"
								type="password"
								value={draft.apiKey}
								onChange={(e) => patchDraft('anthropic', { apiKey: e.target.value })}
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
				</CardContent>
				<CardFooter>
					<Button type="submit" disabled={!isDirty || isSaving}>
						{isSaving ? <Spinner /> : <Save />}
						{t('common.save', 'Save')}
					</Button>
				</CardFooter>
			</Card>
		</form>
	);
}
