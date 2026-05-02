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
					<div className="relative hidden bg-muted lg:flex lg:items-center lg:justify-center lg:order-1">
						<AppIconOpenWriter
							className="text-foreground/80"
							style={{ width: 'clamp(160px, 22vw, 280px)', height: 'clamp(160px, 22vw, 280px)' }}
							aria-hidden="true"
						/>
					</div>
				</div>
			</PageBody>
		</PageContainer>
	);
};

export default ConfigPage;
