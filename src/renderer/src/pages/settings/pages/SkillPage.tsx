import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Upload, AlertCircle, X, CheckCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SectionHeader, SettingRow } from '../components';
import type { SkillInfo } from '../../../../../shared/types';

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

const SkillPage: React.FC = () => {
	const { t } = useTranslation();
	const [skills, setSkills] = useState<SkillInfo[]>([]);
	const [feedback, setFeedback] = useState<ImportFeedback>(FEEDBACK_IDLE);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

	const loadSkills = useCallback(async () => {
		try {
			const list = await window.app.getSkills();
			setSkills(list);
		} catch {
			setSkills([]);
		}
	}, []);

	useEffect(() => {
		loadSkills();
	}, [loadSkills]);

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
				await window.app.deleteSkill(id);
				await loadSkills();
			} catch (err) {
				const message = extractErrorMessage(err) || t('settings.skill.deleteErrorFallback');
				setFeedback({ status: 'error', message });
			}
		},
		[loadSkills, t]
	);

	const handleOpenFolder = useCallback(async () => {
		await window.app.openSkillsFolder();
	}, []);

	const handleImport = useCallback(async () => {
		setFeedback(FEEDBACK_IDLE);
		try {
			const imported = await window.app.importSkill();
			if (imported.length === 0) return;
			await loadSkills();
			const message =
				imported.length === 1
					? t('settings.skill.importSuccess')
					: t('settings.skill.importSuccessMany', { count: imported.length });
			setFeedback({ status: 'success', message });
		} catch (err) {
			const message = extractErrorMessage(err) || t('settings.skill.importErrorFallback');
			setFeedback({ status: 'error', message });
		}
	}, [loadSkills, t]);

	const handleDismissFeedback = useCallback(() => {
		setFeedback(FEEDBACK_IDLE);
	}, []);

	const scopeLabel = (scope: SkillInfo['scope']): string => {
		if (scope === 'user') return t('settings.skill.user');
		if (scope === 'plugin') return t('settings.skill.plugin');
		return t('settings.skill.bundled');
	};

	return (
		<div className="w-full max-w-2xl">
			<h1 className="text-lg font-normal mb-1">{t('settings.skill.title')}</h1>
			<p className="text-sm text-muted-foreground mb-6">{t('settings.skill.subtitle')}</p>

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
						aria-label={t('settings.skill.dismissError')}
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
						aria-label={t('settings.skill.dismissSuccess')}
					>
						<X size={14} aria-hidden="true" />
					</button>
				</div>
			)}

			<SectionHeader title={t('settings.skill.actions')} />
			<div className="flex gap-2 py-3 border-b">
				<Button variant="outline" size="sm" onClick={handleOpenFolder}>
					<FolderOpen size={14} className="mr-1.5" />
					{t('settings.skill.openFolder')}
				</Button>
				<Button variant="outline" size="sm" onClick={handleImport}>
					<Upload size={14} className="mr-1.5" />
					{t('settings.skill.import')}
				</Button>
			</div>

			<SectionHeader title={t('settings.skill.installed')} />
			{skills.length === 0 ? (
				<p className="text-sm text-muted-foreground py-3">{t('settings.skill.noSkills')}</p>
			) : (
				skills.map((skill) => {
					const isUser = skill.scope === 'user';
					const isConfirming = confirmDeleteId === skill.id;
					const label = skill.emoji ? `${skill.emoji} ${skill.name}` : skill.name;
					return (
						<SettingRow
							key={`${skill.scope}:${skill.id}`}
							label={label}
							description={skill.description}
						>
							<div className="flex items-center gap-2">
								<Badge variant="secondary">{scopeLabel(skill.scope)}</Badge>
								{isUser &&
									(isConfirming ? (
										<button
											type="button"
											onClick={() => handleDelete(skill.id)}
											className="text-sm text-destructive hover:text-destructive/80 transition-colors"
										>
											{t('settings.skill.confirmDelete')}
										</button>
									) : (
										<button
											type="button"
											onClick={() => setConfirmDeleteId(skill.id)}
											className="text-muted-foreground hover:text-destructive transition-colors"
											aria-label={t('settings.skill.confirmDelete')}
										>
											<Trash2 size={14} />
										</button>
									))}
							</div>
						</SettingRow>
					);
				})
			)}
		</div>
	);
};

export default SkillPage;
