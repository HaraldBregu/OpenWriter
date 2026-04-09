import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectWorkspaceInfo } from '../../../../../shared/types';
import { AppInput } from '@/components/app/AppInput';
import { useAppDispatch } from '@/store';
import { loadProjectName } from '@/store/workspace/actions';
import { SectionHeader, SettingRow } from './components';

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
// Main page
// ---------------------------------------------------------------------------

const WorkspacePage: React.FC = () => {
	const { t } = useTranslation();
	const reduxDispatch = useAppDispatch();

	const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(null);
	const [projectInfo, setProjectInfo] = useState<ProjectWorkspaceInfo | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);

	const [editingField, setEditingField] = useState<EditingField>(null);
	const [draft, setDraft] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState(false);
	const descriptionInputRef = useRef<HTMLInputElement>(null);

	// ---- Load workspace data ------------------------------------------------

	useEffect(() => {
		let cancelled = false;

		Promise.all([window.workspace.getCurrent(), window.workspace.getProjectInfo()])
			.then(([workspace, info]) => {
				if (cancelled) return;
				setCurrentWorkspace(workspace);
				setProjectInfo(info);
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
				if (editingField === 'name') {
					reduxDispatch(loadProjectName());
				}
			})
			.catch(() => {
				setSaveError(true);
			})
			.finally(() => {
				setIsSaving(false);
			});
	}, [editingField, draft, projectInfo, reduxDispatch]);

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
		<div className="w-full max-w-2xl p-4 sm:p-6" aria-busy={isSaving}>
			{/* Page title */}
			<h1 className="text-lg font-normal mb-6">{t('workspacePage.title')}</h1>

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

			{/* ── Base Information ─────────────────────────────────────────── */}
			<SectionHeader title={t('workspacePage.sections.baseInfo')} />

			{/* Workspace path */}
			<SettingRow label={t('workspacePage.path')} description={t('workspacePage.pathDescription')}>
				<span
					className="font-mono text-xs truncate max-w-xs inline-block text-muted-foreground"
					title={currentWorkspace ?? t('workspacePage.notSet')}
					aria-live="polite"
					aria-atomic="true"
				>
					{isLoading ? t('workspacePage.loading') : (currentWorkspace ?? t('workspacePage.notSet'))}
				</span>
			</SettingRow>

			{!isLoading && currentWorkspace && projectInfo && (
				<>
					{/* Project name (editable) */}
					<SettingRow
						label={t('workspacePage.name')}
						description={t('workspacePage.nameDescription')}
					>
						{editingField === 'name' ? (
							<AppInput
								autoFocus
								value={draft}
								onChange={(e) => setDraft(e.target.value)}
								onBlur={handleCommit}
								onKeyDown={handleEditKeyDown}
								disabled={isSaving}
								className="h-7 px-2 py-0 text-sm w-56"
								aria-label={t('workspacePage.namePlaceholder')}
							/>
						) : (
							<button
								type="button"
								onClick={() => handleStartEdit('name')}
								className="text-sm truncate max-w-[14rem] text-right hover:text-foreground hover:underline underline-offset-2 transition-colors cursor-text"
								title={projectInfo.name || t('workspacePage.namePlaceholder')}
								aria-label={`${t('common.edit')} ${t('workspacePage.name')}: ${projectInfo.name || t('workspacePage.namePlaceholder')}`}
							>
								{projectInfo.name || (
									<span className="text-muted-foreground italic">
										{t('workspacePage.namePlaceholder')}
									</span>
								)}
							</button>
						)}
					</SettingRow>

					{/* Description (editable) */}
					<SettingRow
						label={t('workspacePage.descriptionLabel')}
						description={t('workspacePage.descriptionDescription')}
					>
						{editingField === 'description' ? (
							<AppInput
								ref={descriptionInputRef}
								value={draft}
								onChange={(e) => setDraft(e.target.value)}
								onBlur={handleCommit}
								onKeyDown={handleEditKeyDown}
								disabled={isSaving}
								className="h-7 px-2 py-0 text-sm w-56"
								aria-label={t('workspacePage.descriptionPlaceholder')}
							/>
						) : (
							<button
								type="button"
								onClick={() => handleStartEdit('description')}
								className="text-sm text-right max-w-[14rem] truncate hover:text-foreground hover:underline underline-offset-2 transition-colors cursor-text"
								title={projectInfo.description || t('workspacePage.descriptionPlaceholder')}
								aria-label={`${t('common.edit')} ${t('workspacePage.descriptionLabel')}: ${projectInfo.description || t('workspacePage.descriptionPlaceholder')}`}
							>
								{projectInfo.description || (
									<span className="text-muted-foreground italic">
										{t('workspacePage.descriptionPlaceholder')}
									</span>
								)}
							</button>
						)}
					</SettingRow>

					{/* Project ID */}
					<SettingRow
						label={t('workspacePage.projectId')}
						description={t('workspacePage.projectIdDescription')}
					>
						<span className="font-mono text-xs text-muted-foreground truncate max-w-[14rem] inline-block">
							{projectInfo.projectId}
						</span>
					</SettingRow>

					{/* ── Versioning ────────────────────────────────────────── */}
					<SectionHeader title={t('workspacePage.sections.versioning')} />

					<SettingRow
						label={t('workspacePage.schemaVersion')}
						description={t('workspacePage.schemaVersionDescription')}
					>
						<span className="font-mono text-sm">{projectInfo.version}</span>
					</SettingRow>

					<SettingRow
						label={t('workspacePage.appVersion')}
						description={t('workspacePage.appVersionDescription')}
					>
						<span className="font-mono text-sm">{projectInfo.appVersion}</span>
					</SettingRow>

					<SettingRow
						label={t('workspacePage.createdAt')}
						description={t('workspacePage.createdAtDescription')}
					>
						<span className="text-sm">{formatDate(projectInfo.createdAt)}</span>
					</SettingRow>

					<SettingRow
						label={t('workspacePage.updatedAt')}
						description={t('workspacePage.updatedAtDescription')}
					>
						<span className="text-sm">{formatDate(projectInfo.updatedAt)}</span>
					</SettingRow>
				</>
			)}
		</div>
	);
};

export default WorkspacePage;
