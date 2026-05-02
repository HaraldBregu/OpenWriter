import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from '@tanstack/react-form';
import { ArrowRight, Loader2 } from 'lucide-react';
import { AppIconOpenWriter } from '@/components/app';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/Field';
import { Separator } from '@/components/ui/Separator';
import { PageBody, PageContainer } from '@/components/app/base/page';
import { TitleBar } from '@/components/app/titlebar/TitleBar';
import { PROVIDER_CATALOGUE, PROVIDER_IDS, getProvider } from '../../../../shared/providers';
import type { Provider, ProviderId, AppStartupInfo } from '../../../../shared/types';

interface ConfigPageProps {
	onConfigured: (startupInfo: AppStartupInfo) => void;
}

type FormValues = {
	firstName: string;
	lastName: string;
	tokens: Record<ProviderId, string>;
};

const EMPTY_TOKENS = Object.fromEntries(
	PROVIDER_IDS.map((providerId) => [providerId, ''])
) as Record<ProviderId, string>;

const PROVIDER_LABELS = Object.fromEntries(
	PROVIDER_CATALOGUE.map((provider) => [provider.id, provider.name])
) as Record<ProviderId, string>;

const DEFAULT_VALUES: FormValues = {
	firstName: '',
	lastName: '',
	tokens: EMPTY_TOKENS,
};

const ConfigPage: React.FC<ConfigPageProps> = ({ onConfigured }) => {
	const { t } = useTranslation();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const form = useForm({
		defaultValues: DEFAULT_VALUES,
		onSubmit: async ({ value }) => {
			if (typeof window.app?.completeFirstRunConfiguration !== 'function') return;
			setErrorMessage(null);
			try {
				const providers: Provider[] = PROVIDER_IDS.flatMap((providerId) => {
					const catalog = getProvider(providerId);
					if (!catalog) return [];
					return [
						{
							id: catalog.id,
							name: catalog.name,
							apiKey: value.tokens[providerId].trim(),
						},
					];
				});
				const startupInfo = await window.app.completeFirstRunConfiguration(
					{ firstName: value.firstName, lastName: value.lastName },
					providers
				);
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
			}
		},
	});

	return (
		<PageContainer className="h-screen">
			<TitleBar title="OpenWriter" />

			<PageBody className="items-center px-8 py-12">
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
					<p className="text-sm text-muted-foreground text-center max-w-2xl leading-relaxed">
						{t(
							'startup.firstTime.description',
							'Tell us a bit about you and connect your providers. You can change anything later in Settings.'
						)}
					</p>
				</div>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="w-full max-w-2xl"
					noValidate
				>
					<FieldGroup>
						<FieldSet>
							<FieldLegend>{t('startup.firstTime.profileSection', 'Your profile')}</FieldLegend>
							<div className="flex flex-col gap-4">
								<form.Field name="firstName">
									{(field) => (
										<Field>
											<FieldLabel htmlFor={field.name}>
												{t('settings.profile.firstName', 'First name')}
											</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => {
													field.handleChange(e.target.value);
													if (errorMessage) setErrorMessage(null);
												}}
												placeholder={t('settings.profile.firstNamePlaceholder', 'First name')}
												autoComplete="given-name"
											/>
										</Field>
									)}
								</form.Field>
								<form.Field name="lastName">
									{(field) => (
										<Field>
											<FieldLabel htmlFor={field.name}>
												{t('settings.profile.lastName', 'Last name')}
											</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => {
													field.handleChange(e.target.value);
													if (errorMessage) setErrorMessage(null);
												}}
												placeholder={t('settings.profile.lastNamePlaceholder', 'Last name')}
												autoComplete="family-name"
											/>
										</Field>
									)}
								</form.Field>
							</div>
						</FieldSet>

						<Separator />

						<FieldSet>
							<FieldLegend>
								{t('startup.firstTime.providersSection', 'Provider tokens')}
							</FieldLegend>
							<div className="flex flex-col gap-4">
								{PROVIDER_IDS.map((providerId) => (
									<form.Field key={providerId} name={`tokens.${providerId}` as const}>
										{(field) => (
											<Field>
												<FieldLabel htmlFor={`first-run-${providerId}`}>
													{PROVIDER_LABELS[providerId]}
												</FieldLabel>
												<Input
													id={`first-run-${providerId}`}
													type="password"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => {
														field.handleChange(e.target.value);
														if (errorMessage) setErrorMessage(null);
													}}
													placeholder={t('startup.firstTime.tokenPlaceholder', 'Paste API token')}
													autoComplete="off"
													spellCheck={false}
													className="font-mono"
												/>
											</Field>
										)}
									</form.Field>
								))}
							</div>
						</FieldSet>

						{errorMessage && <p className="text-xs text-destructive">{errorMessage}</p>}

						<form.Subscribe selector={(s) => s.isSubmitting}>
							{(isSubmitting) => (
								<Button type="submit" disabled={isSubmitting} className="self-start">
									{isSubmitting ? (
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
							)}
						</form.Subscribe>
					</FieldGroup>
				</form>
			</PageBody>
		</PageContainer>
	);
};

export default ConfigPage;
