import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectWorkspaceInfo } from '../../../../shared/types';
import { AppInput } from '@/components/app/AppInput';
import { AGENT_DEFINITIONS, AGENT_IDS } from '../../../../shared/aiSettings';
import type { AgentId } from '../../../../shared/aiSettings';

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
// Setting row — label + description on the left, action/value on the right
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

const WorkspacePage: React.FC = () => {
	const { t } = useTranslation();

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

	const handleNameKeyDown = useCallback(
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

	const handleDescriptionKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Escape') {
				handleCancel();
			}
		},
		[handleCancel]
	);

	// Focus textarea when description editing starts
	useEffect(() => {
		if (editingField === 'description' && textareaRef.current) {
			textareaRef.current.focus();
			const len = textareaRef.current.value.length;
			textareaRef.current.setSelectionRange(len, len);
		}
	}, [editingField]);

	// ---- Render -------------------------------------------------------------

	return (
		<div className="w-full max-w-2xl p-6" aria-busy={isSaving}>
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
								onKeyDown={handleNameKeyDown}
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
							<AppTextarea
								ref={textareaRef}
								value={draft}
								onChange={(e) => setDraft(e.target.value)}
								onBlur={handleCommit}
								onKeyDown={handleDescriptionKeyDown}
								disabled={isSaving}
								rows={3}
								className="text-sm w-56 resize-none py-1 px-2"
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

					{/* ── Agent Configuration ───────────────────────────────── */}
					<SectionHeader title={t('workspacePage.sections.agentConfig')} />

					{projectInfo.agents.length > 0 ? (
						projectInfo.agents.map((agent) => {
							const isKnownAgent = (AGENT_IDS as readonly string[]).includes(agent.agentId);
							const def = isKnownAgent ? AGENT_DEFINITIONS[agent.agentId as AgentId] : null;
							return (
								<SettingRow
									key={agent.agentId}
									label={def?.name ?? agent.agentId}
									description={`${t('workspacePage.temperature')}: ${agent.temperature.toFixed(1)} \u00B7 ${t('workspacePage.reasoning')}: ${agent.reasoning ? t('workspacePage.enabled') : t('workspacePage.disabled')}`}
								>
									<span className="text-xs text-muted-foreground">
										{agent.providerId} / {agent.modelId}
									</span>
								</SettingRow>
							);
						})
					) : (
						<SettingRow
							label={t('workspacePage.noAgents')}
							description={t('workspacePage.noAgentsDescription')}
						>
							<span />
						</SettingRow>
					)}

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
