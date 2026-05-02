import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from '@tanstack/react-form';
import { ArrowRight, Loader2 } from 'lucide-react';
import { AppIconOpenWriter } from '@/components/app';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from '@/components/ui/Field';
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

			<PageBody className="p-0">
				<div className="grid min-h-full lg:grid-cols-2">
					<div className="flex flex-col gap-4 p-6 md:p-10 overflow-y-auto lg:order-2">
						<div className="flex justify-center gap-2 md:justify-start">
							<a href="#" className="flex items-center gap-2 font-medium">
								<div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
									<AppIconOpenWriter className="size-4" aria-hidden="true" />
								</div>
								OpenWriter
							</a>
						</div>
						<div className="flex flex-1 items-center justify-center">
							<div className="w-full max-w-sm">
								<form
									onSubmit={(e) => {
										e.preventDefault();
										e.stopPropagation();
										form.handleSubmit();
									}}
									className="flex flex-col gap-6"
									noValidate
								>
									<FieldGroup>
										<div className="flex flex-col items-center gap-1 text-center">
											<h1 className="text-2xl font-bold">
												{t('startup.firstTime.title', 'Welcome to OpenWriter')}
											</h1>
											<p className="text-sm text-balance text-muted-foreground">
												{t(
													'startup.firstTime.description',
													'Tell us about you and connect your providers to get started.'
												)}
											</p>
										</div>

										<FieldSet>
											<FieldLegend variant="label">
												{t('startup.firstTime.profileSection', 'Your profile')}
											</FieldLegend>
											<FieldGroup>
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
																placeholder="John"
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
																placeholder="Doe"
																autoComplete="family-name"
															/>
														</Field>
													)}
												</form.Field>
											</FieldGroup>
										</FieldSet>

										<FieldSet>
											<FieldLegend variant="label">
												{t('startup.firstTime.providersSection', 'Provider tokens')}
											</FieldLegend>
											<FieldGroup>
												{PROVIDER_IDS.map((providerId) => (
													<form.Field
														key={providerId}
														name={`tokens.${providerId}` as const}
													>
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
																	placeholder={t(
																		'startup.firstTime.tokenPlaceholder',
																		'Paste API token'
																	)}
																	autoComplete="off"
																	spellCheck={false}
																	className="font-mono"
																/>
															</Field>
														)}
													</form.Field>
												))}
												<FieldDescription>
													{t(
														'startup.firstTime.tokensHint',
														'Leave any field blank to skip and configure later in Settings.'
													)}
												</FieldDescription>
											</FieldGroup>
										</FieldSet>

										{errorMessage && (
											<p className="text-xs text-destructive">{errorMessage}</p>
										)}

										<Field>
											<form.Subscribe selector={(s) => s.isSubmitting}>
												{(isSubmitting) => (
													<Button type="submit" disabled={isSubmitting}>
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
											<FieldDescription className="px-6 text-center">
												{t(
													'startup.firstTime.privacy',
													'Tokens stay on your machine and are sent only to the provider you configured.'
												)}
											</FieldDescription>
										</Field>
									</FieldGroup>
								</form>
							</div>
						</div>
					</div>
					<div className="relative hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:order-1 p-10 gap-10">
						<div className="flex items-center gap-3">
							<div className="flex size-9 items-center justify-center rounded-md bg-primary-foreground/15">
								<AppIconOpenWriter className="size-5" aria-hidden="true" />
							</div>
							<span className="text-lg font-semibold tracking-tight">OpenWriter</span>
						</div>

						<div className="flex flex-1 flex-col justify-center gap-6 max-w-md">
							<h2 className="text-4xl font-semibold tracking-tight leading-tight">
								{t(
									'startup.firstTime.leftTitle',
									'Your writing, your models, your machine.'
								)}
							</h2>
							<p className="text-sm text-primary-foreground/80 leading-relaxed">
								{t(
									'startup.firstTime.leftDescription',
									'OpenWriter is a local-first writing studio. Bring your own keys for OpenAI, Anthropic, Google, and more — drafts and credentials never leave your device.'
								)}
							</p>
							<ul className="flex flex-col gap-3 text-sm text-primary-foreground/85">
								<li className="flex gap-2">
									<span aria-hidden="true">→</span>
									{t(
										'startup.firstTime.leftBullet1',
										'Encrypted local storage. No accounts, no cloud sync.'
									)}
								</li>
								<li className="flex gap-2">
									<span aria-hidden="true">→</span>
									{t(
										'startup.firstTime.leftBullet2',
										'Switch providers per document. Compare answers side-by-side.'
									)}
								</li>
								<li className="flex gap-2">
									<span aria-hidden="true">→</span>
									{t(
										'startup.firstTime.leftBullet3',
										'Works offline once your keys are configured.'
									)}
								</li>
							</ul>
						</div>

						<footer className="flex flex-col gap-2 text-xs text-primary-foreground/70 max-w-md">
							<p>
								{t(
									'startup.firstTime.leftFooterTagline',
									'Built by writers, for writers. Free and open source.'
								)}
							</p>
							<div className="flex gap-4">
								<a href="#" className="hover:underline">
									{t('startup.firstTime.leftFooterPrivacy', 'Privacy')}
								</a>
								<a href="#" className="hover:underline">
									{t('startup.firstTime.leftFooterTerms', 'Terms')}
								</a>
								<a href="#" className="hover:underline">
									{t('startup.firstTime.leftFooterDocs', 'Documentation')}
								</a>
								<span className="ml-auto">v{__APP_VERSION__}</span>
							</div>
						</footer>
					</div>
				</div>
			</PageBody>
		</PageContainer>
	);
};

export default ConfigPage;
