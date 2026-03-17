import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectWorkspaceInfo } from '../../../../shared/types';
import { AppInput } from '@/components/app/AppInput';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

type EditingField = 'name' | 'description' | null;

// ---------------------------------------------------------------------------
// Section header — small muted text used as a visual divider
// ---------------------------------------------------------------------------

interface SectionHeaderProps {
	readonly title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => (
	<div className="pt-6 pb-2 first:pt-0">
		<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</h2>
	</div>
);

// ---------------------------------------------------------------------------
// Setting row — label on the left, action/value on the right
// ---------------------------------------------------------------------------

interface SettingRowProps {
	readonly label: string;
	readonly description?: string;
	readonly children: React.ReactNode;
}

const SettingRow: React.FC<SettingRowProps> = ({ label, description, children }) => (
	<div className="flex items-center justify-between py-3 border-b last:border-b-0">
		<div className="min-w-0 mr-4">
			<p className="text-sm">{label}</p>
			{description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
		</div>
		<div className="min-w-0">{children}</div>
	</div>
);

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const GeneralSettingsPage: React.FC = () => {
	const { t } = useTranslation();

	const [projectInfo, setProjectInfo] = useState<ProjectWorkspaceInfo | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);

	const [editingField, setEditingField] = useState<EditingField>(null);
	const [draft, setDraft] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState(false);
	const descriptionInputRef = useRef<HTMLInputElement>(null);

	// ---- Load data ----------------------------------------------------------

	useEffect(() => {
		let cancelled = false;

		window.workspace
			.getProjectInfo()
			.then((info) => {
				if (!cancelled) setProjectInfo(info);
			})
			.catch(() => {
				if (!cancelled) setLoadError(true);
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, []);

	// ---- Edit handlers ------------------------------------------------------

	const handleStartEdit = useCallback(
		(field: 'name' | 'description') => {
			if (!projectInfo) return;
			setSaveError(false);
			setEditingField(field);
			setDraft(field === 'name' ? projectInfo.name : projectInfo.description);
		},
		[projectInfo]
	);

	const handleCancel = useCallback(() => {
		setEditingField(null);
		setDraft('');
		setSaveError(false);
	}, []);

	const handleCommit = useCallback(() => {
		if (!editingField || !projectInfo) return;

		const trimmed = draft.trim();
		const current = editingField === 'name' ? projectInfo.name : projectInfo.description;

		if (trimmed === (current ?? '')) {
			setEditingField(null);
			return;
		}

		setIsSaving(true);

		const apiCall =
			editingField === 'name'
				? window.workspace.updateProjectName(trimmed)
				: window.workspace.updateProjectDescription(trimmed);

		apiCall
			.then((updated) => {
				setProjectInfo(updated);
				setEditingField(null);
			})
			.catch(() => {
				setSaveError(true);
			})
			.finally(() => {
				setIsSaving(false);
			});
	}, [editingField, draft, projectInfo]);

	const handleEditKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				handleCommit();
			} else if (e.key === 'Escape') {
				handleCancel();
			}
		},
		[handleCommit, handleCancel]
	);

	// Focus input when description editing starts
	useEffect(() => {
		if (editingField === 'description' && descriptionInputRef.current) {
			descriptionInputRef.current.focus();
			const len = descriptionInputRef.current.value.length;
			descriptionInputRef.current.setSelectionRange(len, len);
		}
	}, [editingField]);

	// ---- Render -------------------------------------------------------------

	return (
		<div className="w-full max-w-2xl p-6" aria-busy={isSaving}>
			{/* Page title */}
			<h1 className="text-lg font-normal mb-6">{t('settings.title')}</h1>

			{/* Load error */}
			{loadError && (
				<p className="text-sm text-destructive mb-4" role="alert">
					{t('workspacePage.loadError')}
				</p>
			)}

			{/* Save error */}
			{saveError && (
				<p className="text-sm text-destructive mb-4" role="alert">
					{t('workspacePage.saveError')}
				</p>
			)}

			{/* ── Application ─────────────────────────────────────────────── */}
			<SectionHeader title={t('settings.sections.workspace')} />

			{isLoading && (
				<SettingRow label={t('settings.workspace.projectName')}>
					<span className="text-sm text-muted-foreground">{t('settings.workspace.loading')}</span>
				</SettingRow>
			)}

			{!isLoading && projectInfo && (
				<>
					{/* Project name (editable) */}
					<SettingRow label={t('settings.workspace.projectName')}>
						{editingField === 'name' ? (
							<AppInput
								autoFocus
								value={draft}
								onChange={(e) => setDraft(e.target.value)}
								onBlur={handleCommit}
								onKeyDown={handleEditKeyDown}
								disabled={isSaving}
								className="h-7 px-2 py-0 text-sm w-56"
								aria-label={t('settings.workspace.projectNamePlaceholder')}
							/>
						) : (
							<button
								type="button"
								onClick={() => handleStartEdit('name')}
								className="text-sm truncate max-w-[14rem] text-right hover:text-foreground hover:underline underline-offset-2 transition-colors cursor-text"
								title={projectInfo.name || t('settings.workspace.projectNamePlaceholder')}
								aria-label={`${t('settings.workspace.projectName')}: ${projectInfo.name || t('settings.workspace.projectNamePlaceholder')}`}
							>
								{projectInfo.name || (
									<span className="text-muted-foreground italic">
										{t('settings.workspace.projectNamePlaceholder')}
									</span>
								)}
							</button>
						)}
					</SettingRow>

					{/* Description (editable) */}
					<SettingRow label={t('settings.workspace.projectDescription')}>
						{editingField === 'description' ? (
							<AppInput
								ref={descriptionInputRef}
								value={draft}
								onChange={(e) => setDraft(e.target.value)}
								onBlur={handleCommit}
								onKeyDown={handleEditKeyDown}
								disabled={isSaving}
								className="h-7 px-2 py-0 text-sm w-56"
								aria-label={t('settings.workspace.projectDescriptionPlaceholder')}
							/>
						) : (
							<button
								type="button"
								onClick={() => handleStartEdit('description')}
								className="text-sm text-right max-w-[14rem] truncate hover:text-foreground hover:underline underline-offset-2 transition-colors cursor-text"
								title={
									projectInfo.description || t('settings.workspace.projectDescriptionPlaceholder')
								}
								aria-label={`${t('settings.workspace.projectDescription')}: ${projectInfo.description || t('settings.workspace.projectDescriptionPlaceholder')}`}
							>
								{projectInfo.description || (
									<span className="text-muted-foreground italic">
										{t('settings.workspace.projectDescriptionPlaceholder')}
									</span>
								)}
							</button>
						)}
					</SettingRow>

					{/* App version */}
					<SettingRow label={t('settings.workspace.appVersion')}>
						<span className="font-mono text-sm">{projectInfo.appVersion}</span>
					</SettingRow>

					{/* Schema version */}
					<SettingRow label={t('settings.workspace.schemaVersion')}>
						<span className="font-mono text-sm">{projectInfo.version}</span>
					</SettingRow>

					{/* Created at */}
					<SettingRow label={t('settings.workspace.createdAt')}>
						<span className="text-sm">{formatDate(projectInfo.createdAt)}</span>
					</SettingRow>

					{/* Updated at */}
					<SettingRow label={t('settings.workspace.updatedAt')}>
						<span className="text-sm">{formatDate(projectInfo.updatedAt)}</span>
					</SettingRow>
				</>
			)}
		</div>
	);
};

export default GeneralSettingsPage;
