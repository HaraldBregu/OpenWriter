import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Upload, AlertCircle, X, CheckCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SectionHeader, SettingRow } from '../components';
import { useAppActions } from '../../../contexts';
import type { CustomThemeInfo } from '../../../../../shared/types';

type ImportStatus = 'idle' | 'success' | 'error';

interface ImportFeedback {
	status: ImportStatus;
	message: string;
}

const FEEDBACK_IDLE: ImportFeedback = { status: 'idle', message: '' };
const SUCCESS_AUTO_DISMISS_MS = 3000;
const CONFIRM_AUTO_DISMISS_MS = 3000;

function extractErrorMessage(err: unknown): string {
	if (err instanceof Error) return err.message;
	if (typeof err === 'string') return err;
	return '';
}

const ThemesPage: React.FC = () => {
	const { t } = useTranslation();
	const [themes, setThemes] = useState<CustomThemeInfo[]>([]);
	const [feedback, setFeedback] = useState<ImportFeedback>(FEEDBACK_IDLE);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
	const { resetState } = useAppActions();

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

	useEffect(() => {
		if (!confirmDeleteId) return;
		const timer = setTimeout(() => setConfirmDeleteId(null), CONFIRM_AUTO_DISMISS_MS);
		return () => clearTimeout(timer);
	}, [confirmDeleteId]);

	const handleDelete = useCallback(
		async (id: string) => {
			setConfirmDeleteId(null);
			try {
				await window.app.deleteTheme(id);
				await loadThemes();
			} catch (err) {
				const message = extractErrorMessage(err) || t('settings.themes.deleteErrorFallback');
				setFeedback({ status: 'error', message });
			}
		},
		[loadThemes, t]
	);

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
				<Button variant="outline" size="sm" onClick={handleOpenFolder}>
					<FolderOpen size={14} className="mr-1.5" />
					{t('settings.themes.openFolder')}
				</Button>
				<Button variant="outline" size="sm" onClick={handleImport}>
					<Upload size={14} className="mr-1.5" />
					{t('settings.themes.import')}
				</Button>
			</div>

			<SectionHeader title={t('settings.themes.installed')} />
			{themes.length === 0 ? (
				<p className="text-sm text-muted-foreground py-3">{t('settings.themes.noThemes')}</p>
			) : (
				themes.map((theme) => {
					const isConfirming = confirmDeleteId === theme.id;
					return (
						<SettingRow
							key={theme.id}
							label={theme.name}
							description={`${theme.author} · v${theme.version}`}
						>
							{isConfirming ? (
								<button
									type="button"
									onClick={() => handleDelete(theme.id)}
									className="text-sm text-destructive hover:text-destructive/80 transition-colors"
								>
									{t('settings.themes.confirmDelete')}
								</button>
							) : (
								<button
									type="button"
									onClick={() => setConfirmDeleteId(theme.id)}
									className="text-muted-foreground hover:text-destructive transition-colors"
								>
									<Trash2 size={14} />
								</button>
							)}
						</SettingRow>
					);
				})
			)}
		</div>
	);
};

export default ThemesPage;
