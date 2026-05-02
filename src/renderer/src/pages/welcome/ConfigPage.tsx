import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Loader2 } from 'lucide-react';
import { AppIconOpenWriter } from '@/components/app';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { TitleBar } from '@/components/app/titlebar/TitleBar';
import { PROVIDER_CATALOGUE, PROVIDER_IDS, getProvider } from '../../../../shared/providers';
import type { Provider, ProviderId, AppStartupInfo } from '../../../../shared/types';

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
						{t('startup.firstTime.title', 'Connect your providers')}
					</h1>
					<p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
						{t(
							'startup.firstTime.description',
							'Add API tokens for the providers you want to use. You can leave any blank and configure them later in Settings.'
						)}
					</p>
				</div>

				<form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col gap-5" noValidate>
					{PROVIDER_IDS.map((providerId) => (
						<div key={providerId} className="grid gap-2">
							<Label htmlFor={`first-run-${providerId}`}>{PROVIDER_LABELS[providerId]}</Label>
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
						</div>
					))}

					{errorMessage && (
						<p className="text-xs text-destructive">{errorMessage}</p>
					)}

					<Button type="submit" className="mt-2" disabled={isSaving}>
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
				</form>
			</div>
		</div>
	);
};

export default ConfigPage;
