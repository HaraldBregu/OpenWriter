import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Loader2 } from 'lucide-react';
import { AppIconOpenWriter } from '@/components/app';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/Field';
import { Separator } from '@/components/ui/Separator';
import { TitleBar } from '@/components/app/titlebar/TitleBar';
import { PROVIDER_CATALOGUE, PROVIDER_IDS, getProvider } from '../../../../shared/providers';
import type { Provider, ProviderId, AppStartupInfo, UserProfile } from '../../../../shared/types';

interface ConfigPageProps {
	onConfigured: (startupInfo: AppStartupInfo) => void;
}

const EMPTY_TOKENS = Object.fromEntries(
	PROVIDER_IDS.map((providerId) => [providerId, ''])
) as Record<ProviderId, string>;

const PROVIDER_LABELS = Object.fromEntries(
	PROVIDER_CATALOGUE.map((provider) => [provider.id, provider.name])
) as Record<ProviderId, string>;

const ConfigPage: React.FC<ConfigPageProps> = ({ onConfigured }) => {
	const { t } = useTranslation();
	const [profile, setProfile] = useState<UserProfile>({ firstName: '', lastName: '' });
	const [tokens, setTokens] = useState<Record<ProviderId, string>>(EMPTY_TOKENS);
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (isSaving || typeof window.app?.completeFirstRunConfiguration !== 'function') {
			return;
		}

		setIsSaving(true);
		setErrorMessage(null);

		try {
			const providers: Provider[] = PROVIDER_IDS.flatMap((providerId) => {
				const catalog = getProvider(providerId);
				if (!catalog) return [];
				return [
					{
						id: catalog.id,
						name: catalog.name,
						apiKey: tokens[providerId].trim(),
					},
				];
			});
			const startupInfo = await window.app.completeFirstRunConfiguration(profile, providers);
			onConfigured(startupInfo);
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: t(
							'startup.firstTime.error',
							'Unable to save your provider tokens right now. Please try again.'
						)
			);
		} finally {
			setIsSaving(false);
		}
	};

	const updateProfile = (field: keyof UserProfile) => (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setProfile((current) => ({ ...current, [field]: value }));
		if (errorMessage) setErrorMessage(null);
	};

	return (
		<div className="flex flex-col h-screen bg-background">
			<TitleBar title="OpenWriter" />

			<div className="flex flex-col items-center flex-1 px-8 py-12 overflow-y-auto">
				<div className="flex flex-col items-center mb-10">
					<AppIconOpenWriter
						className="mb-5 text-foreground"
						style={{
							width: 'clamp(80px, min(14vw, 14vh), 140px)',
							height: 'clamp(80px, min(14vw, 14vh), 140px)',
						}}
						aria-label={t('appTitle')}
						role="img"
					/>
					<h1 className="text-3xl font-semibold text-foreground mb-2 tracking-tight">
						{t('startup.firstTime.title', 'Welcome to OpenWriter')}
					</h1>
					<p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
						{t(
							'startup.firstTime.description',
							'Tell us a bit about you and connect your providers. You can change anything later in Settings.'
						)}
					</p>
				</div>

				<form onSubmit={handleSubmit} className="w-full max-w-md" noValidate>
					<FieldGroup>
						<FieldSet>
							<FieldLegend>
								{t('startup.firstTime.profileSection', 'Your profile')}
							</FieldLegend>
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="first-run-firstName">
										{t('settings.profile.firstName', 'First name')}
									</FieldLabel>
									<Input
										id="first-run-firstName"
										value={profile.firstName}
										onChange={updateProfile('firstName')}
										placeholder={t('settings.profile.firstNamePlaceholder', 'First name')}
										autoComplete="given-name"
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="first-run-lastName">
										{t('settings.profile.lastName', 'Last name')}
									</FieldLabel>
									<Input
										id="first-run-lastName"
										value={profile.lastName}
										onChange={updateProfile('lastName')}
										placeholder={t('settings.profile.lastNamePlaceholder', 'Last name')}
										autoComplete="family-name"
									/>
								</Field>
							</FieldGroup>
						</FieldSet>

						<Separator />

						<FieldSet>
							<FieldLegend>
								{t('startup.firstTime.providersSection', 'Provider tokens')}
							</FieldLegend>
							<FieldGroup>
								{PROVIDER_IDS.map((providerId) => (
									<Field key={providerId}>
										<FieldLabel htmlFor={`first-run-${providerId}`}>
											{PROVIDER_LABELS[providerId]}
										</FieldLabel>
										<Input
											id={`first-run-${providerId}`}
											type="password"
											value={tokens[providerId]}
											onChange={(event) => {
												const value = event.target.value;
												setTokens((current) => ({ ...current, [providerId]: value }));
												if (errorMessage) setErrorMessage(null);
											}}
											placeholder={t('startup.firstTime.tokenPlaceholder', 'Paste API token')}
											autoComplete="off"
											spellCheck={false}
											className="font-mono"
										/>
									</Field>
								))}
							</FieldGroup>
						</FieldSet>

						{errorMessage && <p className="text-xs text-destructive">{errorMessage}</p>}

						<Button type="submit" disabled={isSaving}>
							{isSaving ? (
								<>
									<Loader2 className="animate-spin" />
									{t('startup.firstTime.saving', 'Saving...')}
								</>
							) : (
								<>
									{t('startup.firstTime.save', 'Save and Continue')}
									<ArrowRight />
								</>
							)}
						</Button>
					</FieldGroup>
				</form>
			</div>
		</div>
	);
};

export default ConfigPage;
