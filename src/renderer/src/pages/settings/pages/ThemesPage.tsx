import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Upload, Check, AlertCircle, X, CheckCircle } from 'lucide-react';
import { AppButton } from '@/components/app';
import { SectionHeader, SettingRow } from '../components';
import { useCustomThemeId, useAppActions } from '../../../contexts';
import type { CustomThemeInfo } from '../../../../../shared/types';

type ImportStatus = 'idle' | 'success' | 'error';

interface ImportFeedback {
	status: ImportStatus;
	message: string;
}

const FEEDBACK_IDLE: ImportFeedback = { status: 'idle', message: '' };
const SUCCESS_AUTO_DISMISS_MS = 3000;

function extractErrorMessage(err: unknown): string {
	if (err instanceof Error) return err.message;
	if (typeof err === 'string') return err;
	return '';
}

const ThemesPage: React.FC = () => {
	const { t } = useTranslation();
	const [themes, setThemes] = useState<CustomThemeInfo[]>([]);
	const [feedback, setFeedback] = useState<ImportFeedback>(FEEDBACK_IDLE);
	const customThemeId = useCustomThemeId();
	const { setCustomTheme } = useAppActions();

	const loadThemes = useCallback(async () => {
		try {
			const list = await window.app.getCustomThemes();
			setThemes(list);
		} catch {
			setThemes([]);
		}
	}, []);

	useEffect(() => {
		loadThemes();
	}, [loadThemes]);

	useEffect(() => {
		if (feedback.status !== 'success') return;
		const timer = setTimeout(() => setFeedback(FEEDBACK_IDLE), SUCCESS_AUTO_DISMISS_MS);
		return () => clearTimeout(timer);
	}, [feedback.status]);

	const handleOpenFolder = useCallback(async () => {
		await window.app.openThemesFolder();
	}, []);

	const handleImport = useCallback(async () => {
		setFeedback(FEEDBACK_IDLE);
		try {
			const result = await window.app.importTheme();
			if (result === null) return;
			await loadThemes();
			setFeedback({ status: 'success', message: t('settings.themes.importSuccess') });
		} catch (err) {
			const message = extractErrorMessage(err) || t('settings.themes.importErrorFallback');
			setFeedback({ status: 'error', message });
		}
	}, [loadThemes, t]);

	const handleDismissFeedback = useCallback(() => {
		setFeedback(FEEDBACK_IDLE);
	}, []);

	const handleSelect = useCallback(
		(id: string) => {
			setCustomTheme(customThemeId === id ? null : id);
		},
		[customThemeId, setCustomTheme]
	);

	return (
		<div className="w-full max-w-2xl p-4 sm:p-6">
			<h1 className="text-lg font-normal mb-6">{t('settings.themes.title')}</h1>

			{feedback.status === 'error' && (
				<div
					role="alert"
					aria-live="assertive"
					aria-atomic="true"
					className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 mb-4 text-sm text-destructive"
				>
					<AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
					<span className="flex-1">{feedback.message}</span>
					<button
						type="button"
						onClick={handleDismissFeedback}
						className="shrink-0 rounded p-0.5 hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive transition-colors"
						aria-label={t('settings.themes.dismissError')}
					>
						<X size={14} aria-hidden="true" />
					</button>
				</div>
			)}

			{feedback.status === 'success' && (
				<div
					role="status"
					aria-live="polite"
					aria-atomic="true"
					className="flex items-center gap-3 rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2.5 mb-4 text-sm text-green-700 dark:text-green-400"
				>
					<CheckCircle size={16} className="shrink-0" aria-hidden="true" />
					<span className="flex-1">{feedback.message}</span>
					<button
						type="button"
						onClick={handleDismissFeedback}
						className="shrink-0 rounded p-0.5 hover:bg-green-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 transition-colors"
						aria-label={t('settings.themes.dismissSuccess')}
					>
						<X size={14} aria-hidden="true" />
					</button>
				</div>
			)}

			<SectionHeader title={t('settings.themes.actions')} />
			<div className="flex gap-2 py-3 border-b">
				<AppButton variant="outline" size="sm" onClick={handleOpenFolder}>
					<FolderOpen size={14} className="mr-1.5" />
					{t('settings.themes.openFolder')}
				</AppButton>
				<AppButton variant="outline" size="sm" onClick={handleImport}>
					<Upload size={14} className="mr-1.5" />
					{t('settings.themes.import')}
				</AppButton>
			</div>

			<SectionHeader title={t('settings.themes.installed')} />
			{themes.length === 0 ? (
				<p className="text-sm text-muted-foreground py-3">{t('settings.themes.noThemes')}</p>
			) : (
				themes.map((theme) => {
					const isActive = customThemeId === theme.id;
					return (
						<SettingRow
							key={theme.id}
							label={theme.name}
							description={`${theme.author} · v${theme.version}`}
						>
							<AppButton
								variant={isActive ? 'default' : 'outline'}
								size="sm"
								onClick={() => handleSelect(theme.id)}
								aria-pressed={isActive}
							>
								{isActive && <Check size={14} className="mr-1" />}
								{isActive ? t('settings.themes.active') : t('settings.themes.activate')}
							</AppButton>
						</SettingRow>
					);
				})
			)}
		</div>
	);
};

export default ThemesPage;
