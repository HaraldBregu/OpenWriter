import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { AppIconOpenWriter } from '@/components/app';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { AppTitleBar } from '@/components/app/base/AppTitleBar';
import { PROVIDER_CATALOGUE, PROVIDER_IDS } from '../../../../shared/providers';
import type { ProviderId, ServiceProvider } from '../../../../shared/types';
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

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (isSaving || typeof window.app?.completeFirstRunConfiguration !== 'function') {
			return;
		}

		setIsSaving(true);
		setErrorMessage(null);

		try {
			const providers: ServiceProvider[] = PROVIDER_IDS.map((providerId) => ({
				name: providerId,
				apikey: tokens[providerId].trim(),
				baseurl: '',
			}));
			const startupInfo = await window.app.completeFirstRunConfiguration(providers);
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
			<AppTitleBar title="OpenWriter" />

			<div className="flex flex-1 items-center justify-center px-6 py-10">
				<div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
					<section className="flex flex-col justify-center rounded-[28px] border border-border/60 bg-gradient-to-br from-background via-background to-muted/30 p-8 shadow-sm sm:p-10">
						<AppIconOpenWriter
							className="mb-6 h-20 w-20 text-foreground sm:h-24 sm:w-24"
							aria-label={t('appTitle')}
							role="img"
						/>
						<p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
							{t('startup.firstTime.eyebrow', 'First-time configuration')}
						</p>
						<h1 className="max-w-md text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
							{t('startup.firstTime.title', 'Connect your providers before you start writing')}
						</h1>
						<p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">
							{t(
								'startup.firstTime.description',
								'Add the API tokens you want OpenWriter to use on this device. Leave any provider blank if you want to configure it later in Settings.'
							)}
						</p>
					</section>

					<section className="rounded-[28px] border border-border/60 bg-background/95 p-6 shadow-sm sm:p-8">
						<form className="flex h-full flex-col" onSubmit={handleSubmit} noValidate>
							<div className="space-y-5">
								{PROVIDER_IDS.map((providerId) => (
									<div key={providerId} className="space-y-2">
										<Label
											htmlFor={`first-run-${providerId}`}
											className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
										>
											{PROVIDER_LABELS[providerId]}
										</Label>
										<AppInput
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
											placeholder={t('startup.firstTime.tokenPlaceholder', 'Paste API token')}
											autoComplete="off"
											spellCheck={false}
											className="h-11 font-mono text-sm"
										/>
									</div>
								))}
							</div>

							{errorMessage && (
								<p className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
									{errorMessage}
								</p>
							)}

							<div className="mt-8 flex items-center justify-between gap-4">
								<p className="max-w-sm text-xs leading-5 text-muted-foreground">
									{t(
										'startup.firstTime.footer',
										'You can revisit provider tokens at any time from the Providers settings page.'
									)}
								</p>
								<Button type="submit" className="min-w-44" disabled={isSaving}>
									{isSaving ? (
										<>
											<Loader2 className="animate-spin" />
											{t('startup.firstTime.saving', 'Saving...')}
										</>
									) : (
										t('startup.firstTime.save', 'Save and Continue')
									)}
								</Button>
							</div>
						</form>
					</section>
				</div>
			</div>
		</div>
	);
};

export default ConfigPage;
