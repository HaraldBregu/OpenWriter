import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, KeyRound, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { AppIconOpenWriter } from '@/components/app';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/Card';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from '@/components/ui/InputGroup';
import { Label } from '@/components/ui/Label';
import { Separator } from '@/components/ui/Separator';
import { TitleBar } from '@/components/app/titlebar/TitleBar';
import { PROVIDER_CATALOGUE, PROVIDER_IDS, getProvider } from '../../../../shared/providers';
import type { ProviderId, Service } from '../../../../shared/types';
import type { AppStartupInfo } from '../../../../shared/types';

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
	const [tokens, setTokens] = useState<Record<ProviderId, string>>(EMPTY_TOKENS);
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const configuredCount = PROVIDER_IDS.filter((providerId) => tokens[providerId].trim().length > 0).length;
	const providerDescriptions: Record<ProviderId, string> = {
		openai: t(
			'startup.firstTime.providers.openaiDescription',
			'OpenAI models, tools, and multimodal workflows.'
		),
		anthropic: t(
			'startup.firstTime.providers.anthropicDescription',
			'Claude models for drafting, editing, and reasoning.'
		),
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (isSaving || typeof window.app?.completeFirstRunConfiguration !== 'function') {
			return;
		}

		setIsSaving(true);
		setErrorMessage(null);

		try {
			const services: Service[] = PROVIDER_IDS.flatMap((providerId) => {
				const provider = getProvider(providerId);
				if (!provider) return [];
				return [
					{
						provider,
						apiKey: tokens[providerId].trim(),
					},
				];
			});
			const startupInfo = await window.app.completeFirstRunConfiguration(services);
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

	return (
		<div className="flex h-screen flex-col bg-background">
			<TitleBar title="OpenWriter" />

			<div className="relative flex flex-1 overflow-y-auto">
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_36%),radial-gradient(circle_at_bottom_right,hsl(var(--muted-foreground)/0.08),transparent_32%)]" />

				<div className="relative mx-auto flex w-full max-w-6xl items-center px-6 py-10">
					<div className="grid w-full gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
						<Card className="justify-center border border-border/60 bg-card/75 py-0 shadow-sm backdrop-blur-sm">
							<CardHeader className="gap-4 border-b py-8 sm:px-8">
								<div className="flex items-center gap-4">
									<div className="rounded-3xl border border-border/70 bg-background/80 p-4 shadow-sm">
										<AppIconOpenWriter
											className="h-14 w-14 text-foreground sm:h-16 sm:w-16"
											aria-label={t('appTitle')}
											role="img"
										/>
									</div>
									<div className="space-y-3">
										<Badge variant="outline" className="h-6 rounded-full px-3 uppercase tracking-[0.18em]">
											{t('startup.firstTime.eyebrow', 'First-time configuration')}
										</Badge>
										<CardTitle className="max-w-md text-3xl tracking-tight sm:text-4xl">
											{t(
												'startup.firstTime.title',
												'Connect your providers before you start writing'
											)}
										</CardTitle>
									</div>
								</div>
								<CardDescription className="max-w-xl text-sm leading-6">
									{t(
										'startup.firstTime.description',
										'Add the API tokens you want OpenWriter to use on this device. Leave any provider blank if you want to configure it later in Settings.'
									)}
								</CardDescription>
							</CardHeader>

							<CardContent className="space-y-6 py-8 sm:px-8">
								<div className="grid gap-3 sm:grid-cols-3">
									<div className="rounded-2xl border border-border/60 bg-background/80 p-4">
										<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
											{t('startup.firstTime.stats.providers', 'Providers')}
										</p>
										<p className="mt-2 text-2xl font-semibold text-foreground">
											{PROVIDER_IDS.length}
										</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{t(
												'startup.firstTime.stats.providersDescription',
												'Available for first-run setup'
											)}
										</p>
									</div>
									<div className="rounded-2xl border border-border/60 bg-background/80 p-4">
										<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
											{t('startup.firstTime.stats.configured', 'Configured')}
										</p>
										<p className="mt-2 text-2xl font-semibold text-foreground">
											{configuredCount}
										</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{t(
												'startup.firstTime.stats.configuredDescription',
												'Tokens added in this session'
											)}
										</p>
									</div>
									<div className="rounded-2xl border border-border/60 bg-background/80 p-4">
										<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
											{t('startup.firstTime.stats.flexibility', 'Flexibility')}
										</p>
										<p className="mt-2 text-2xl font-semibold text-foreground">
											{t('startup.firstTime.stats.flexibilityValue', 'Later')}
										</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{t(
												'startup.firstTime.stats.flexibilityDescription',
												'Every field can stay blank for now'
											)}
										</p>
									</div>
								</div>

								<div className="space-y-3">
									<div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4">
										<div className="rounded-full bg-primary/10 p-2 text-primary">
											<ShieldCheck className="size-4" />
										</div>
										<div>
											<p className="text-sm font-medium text-foreground">
												{t(
													'startup.firstTime.highlights.deviceTitle',
													'Stored on this device'
												)}
											</p>
											<p className="mt-1 text-sm leading-6 text-muted-foreground">
												{t(
													'startup.firstTime.highlights.deviceDescription',
													'Provider tokens are saved to your local OpenWriter setup and can be updated later from Settings.'
												)}
											</p>
										</div>
									</div>
									<div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4">
										<div className="rounded-full bg-primary/10 p-2 text-primary">
											<Sparkles className="size-4" />
										</div>
										<div>
											<p className="text-sm font-medium text-foreground">
												{t(
													'startup.firstTime.highlights.lightweightTitle',
													'Keep setup lightweight'
												)}
											</p>
											<p className="mt-1 text-sm leading-6 text-muted-foreground">
												{t(
													'startup.firstTime.highlights.lightweightDescription',
													'Add one provider now for a fast start, or leave both empty and finish configuration after onboarding.'
												)}
											</p>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card className="border border-border/60 bg-card/95 py-0 shadow-sm">
							<form className="flex h-full flex-col" onSubmit={handleSubmit} noValidate>
								<CardHeader className="gap-3 border-b py-7 sm:px-8">
									<div className="flex flex-wrap items-center justify-between gap-3">
										<div>
											<CardTitle>{t('startup.firstTime.formTitle', 'Provider access')}</CardTitle>
											<CardDescription className="mt-1">
												{t(
													'startup.firstTime.formDescription',
													'Paste any tokens you want available as soon as OpenWriter opens.'
												)}
											</CardDescription>
										</div>
										<Badge variant={configuredCount > 0 ? 'secondary' : 'outline'}>
											{configuredCount > 0
												? t('startup.firstTime.configured', '{{count}} ready', {
														count: configuredCount,
													})
												: t('startup.firstTime.optional', 'All optional')}
										</Badge>
									</div>
								</CardHeader>

								<CardContent className="space-y-4 py-6 sm:px-8">
									{PROVIDER_IDS.map((providerId) => {
										const hasToken = tokens[providerId].trim().length > 0;

										return (
											<div
												key={providerId}
												className="rounded-2xl border border-border/60 bg-background/65 p-4"
											>
												<div className="flex items-start justify-between gap-3">
													<div>
														<Label
															htmlFor={`first-run-${providerId}`}
															className="text-sm font-medium text-foreground"
														>
															{PROVIDER_LABELS[providerId]}
														</Label>
														<p className="mt-1 text-xs leading-5 text-muted-foreground">
															{providerDescriptions[providerId]}
														</p>
													</div>
													<Badge variant={hasToken ? 'secondary' : 'outline'}>
														{hasToken
															? t('startup.firstTime.added', 'Added')
															: t('startup.firstTime.optionalField', 'Optional')}
													</Badge>
												</div>

												<InputGroup className="mt-4 h-11 rounded-xl bg-background">
													<InputGroupAddon>
														<InputGroupText className="text-xs font-semibold uppercase tracking-[0.14em]">
															<KeyRound className="size-4" />
															{PROVIDER_LABELS[providerId]}
														</InputGroupText>
													</InputGroupAddon>
													<InputGroupInput
														id={`first-run-${providerId}`}
														type="password"
														value={tokens[providerId]}
														onChange={(event) => {
															const value = event.target.value;
															setTokens((current) => ({ ...current, [providerId]: value }));
															if (errorMessage) {
																setErrorMessage(null);
															}
														}}
														placeholder={t(
															'startup.firstTime.tokenPlaceholder',
															'Paste API token'
														)}
														autoComplete="off"
														spellCheck={false}
														className="h-11 font-mono text-sm"
													/>
												</InputGroup>
											</div>
										);
									})}

									{errorMessage && (
										<p className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
											{errorMessage}
										</p>
									)}
								</CardContent>

								<CardFooter className="mt-auto flex-col items-stretch gap-5 rounded-b-xl bg-muted/35 px-6 py-5 sm:px-8">
									<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
										<div className="space-y-3">
											<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
												{t('startup.firstTime.notesTitle', 'Setup notes')}
											</p>
											<Separator />
											<p className="max-w-md text-xs leading-5 text-muted-foreground">
												{t(
													'startup.firstTime.footer',
													'You can revisit provider tokens at any time from the Providers settings page.'
												)}
											</p>
										</div>
										<Button type="submit" size="lg" className="min-w-52" disabled={isSaving}>
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
									</div>
								</CardFooter>
							</form>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ConfigPage;
