import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectWorkspaceInfo } from '../../../../shared/types';
import { AppInput } from '@/components/app/AppInput';
import { AppTextarea } from '@/components/app/AppTextarea';
import { AGENT_DEFINITIONS } from '../../../../shared/aiSettings';
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
// Section row — keeps the key/value layout DRY
// ---------------------------------------------------------------------------

interface SectionRowProps {
	readonly label: string;
	readonly children: React.ReactNode;
	readonly alignTop?: boolean;
}

const SectionRow: React.FC<SectionRowProps> = ({ label, children, alignTop }) => (
	<div className={`flex justify-between ${alignTop ? 'items-start' : 'items-center'} px-4 py-2.5`}>
		<span className={`text-muted-foreground shrink-0 ${alignTop ? 'pt-0.5' : ''}`}>{label}</span>
		<div className="ml-4 flex justify-end">{children}</div>
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

	const [editingField, setEditingField] = useState<EditingField>(null);
	const [draft, setDraft] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

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
				// Errors are surfaced implicitly via null state
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
			})
			.catch(() => {
				// Leave in previous state on error
			})
			.finally(() => {
				setIsSaving(false);
				setEditingField(null);
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
		<div className="mx-auto w-full p-6 space-y-8">
			<div>
				<h1 className="text-lg font-normal">{t('workspacePage.title')}</h1>
				<p className="text-sm text-muted-foreground">{t('workspacePage.description')}</p>
			</div>

			{/* ── Base Information ─────────────────────────────────────────── */}
			<section className="space-y-3">
				<h2 className="text-sm font-normal text-muted-foreground">
					{t('workspacePage.sections.baseInfo')}
				</h2>
				<div className="rounded-md border divide-y text-sm">
					{/* Workspace path */}
					<SectionRow label={t('workspacePage.path')}>
						<span
							className="font-mono text-xs truncate max-w-md"
							title={currentWorkspace ?? t('workspacePage.notSet')}
						>
							{isLoading ? (
								<span className="text-muted-foreground/50">
									{t('workspacePage.loading')}
								</span>
							) : (
								currentWorkspace ?? t('workspacePage.notSet')
							)}
						</span>
					</SectionRow>

					{!isLoading && currentWorkspace && projectInfo && (
						<>
							{/* Project name (editable) */}
							<SectionRow label={t('workspacePage.name')}>
								{editingField === 'name' ? (
									<AppInput
										autoFocus
										value={draft}
										onChange={(e) => setDraft(e.target.value)}
										onBlur={handleCommit}
										onKeyDown={handleNameKeyDown}
										disabled={isSaving}
										className="h-6 px-1.5 py-0 text-xs font-mono w-64 max-w-full"
										aria-label={t('workspacePage.namePlaceholder')}
									/>
								) : (
									<button
										type="button"
										onClick={() => handleStartEdit('name')}
										className="font-mono text-xs truncate max-w-xs text-left hover:text-foreground hover:underline underline-offset-2 transition-colors cursor-text"
										title={
											projectInfo.name || t('workspacePage.namePlaceholder')
										}
										aria-label={`${t('workspacePage.name')}: ${projectInfo.name || t('workspacePage.namePlaceholder')}`}
									>
										{projectInfo.name || (
											<span className="text-muted-foreground/50 italic">
												{t('workspacePage.namePlaceholder')}
											</span>
										)}
									</button>
								)}
							</SectionRow>

							{/* Description (editable) */}
							<SectionRow label={t('workspacePage.descriptionLabel')} alignTop>
								{editingField === 'description' ? (
									<AppTextarea
										ref={textareaRef}
										value={draft}
										onChange={(e) => setDraft(e.target.value)}
										onBlur={handleCommit}
										onKeyDown={handleDescriptionKeyDown}
										disabled={isSaving}
										rows={3}
										className="text-xs font-mono w-64 max-w-full resize-none py-1 px-1.5"
										aria-label={t('workspacePage.descriptionPlaceholder')}
									/>
								) : (
									<button
										type="button"
										onClick={() => handleStartEdit('description')}
										className="font-mono text-xs text-right max-w-xs truncate hover:text-foreground hover:underline underline-offset-2 transition-colors cursor-text"
										title={
											projectInfo.description ||
											t('workspacePage.descriptionPlaceholder')
										}
										aria-label={`${t('workspacePage.descriptionLabel')}: ${projectInfo.description || t('workspacePage.descriptionPlaceholder')}`}
									>
										{projectInfo.description || (
											<span className="text-muted-foreground/50 italic">
												{t('workspacePage.descriptionPlaceholder')}
											</span>
										)}
									</button>
								)}
							</SectionRow>

							{/* Project ID */}
							<SectionRow label={t('workspacePage.projectId')}>
								<span className="font-mono text-xs truncate max-w-xs text-muted-foreground/70">
									{projectInfo.projectId}
								</span>
							</SectionRow>
						</>
					)}
				</div>
			</section>

			{/* ── Agent Configuration ─────────────────────────────────────── */}
			{!isLoading && currentWorkspace && projectInfo && (
				<section className="space-y-3">
					<h2 className="text-sm font-normal text-muted-foreground">
						{t('workspacePage.sections.agentConfig')}
					</h2>
					<div className="rounded-md border divide-y text-sm">
						{projectInfo.agents.length > 0 ? (
							projectInfo.agents.map((agent) => {
								const def =
									AGENT_DEFINITIONS[agent.agentId as AgentId] ?? null;
								return (
									<div key={agent.agentId} className="px-4 py-3">
										<div className="flex justify-between items-center">
											<span className="font-medium text-sm">
												{def?.name ?? agent.agentId}
											</span>
											<span className="text-xs text-muted-foreground">
												{agent.providerId} / {agent.modelId}
											</span>
										</div>
										<div className="flex gap-4 mt-1 text-xs text-muted-foreground">
											<span>
												{t('workspacePage.temperature')}:{' '}
												{agent.temperature.toFixed(1)}
											</span>
											<span>
												{t('workspacePage.reasoning')}:{' '}
												{agent.reasoning
													? t('workspacePage.enabled')
													: t('workspacePage.disabled')}
											</span>
										</div>
									</div>
								);
							})
						) : (
							<div className="px-4 py-3 text-muted-foreground/70 text-center">
								{t('workspacePage.noAgents')}
							</div>
						)}
					</div>
				</section>
			)}

			{/* ── Versioning ──────────────────────────────────────────────── */}
			{!isLoading && currentWorkspace && projectInfo && (
				<section className="space-y-3">
					<h2 className="text-sm font-normal text-muted-foreground">
						{t('workspacePage.sections.versioning')}
					</h2>
					<div className="rounded-md border divide-y text-sm">
						<SectionRow label={t('workspacePage.schemaVersion')}>
							<span className="font-mono text-xs">{projectInfo.version}</span>
						</SectionRow>
						<SectionRow label={t('workspacePage.appVersion')}>
							<span className="font-mono text-xs">{projectInfo.appVersion}</span>
						</SectionRow>
						<SectionRow label={t('workspacePage.createdAt')}>
							<span className="font-mono text-xs">
								{formatDate(projectInfo.createdAt)}
							</span>
						</SectionRow>
						<SectionRow label={t('workspacePage.updatedAt')}>
							<span className="font-mono text-xs">
								{formatDate(projectInfo.updatedAt)}
							</span>
						</SectionRow>
					</div>
				</section>
			)}
		</div>
	);
};

export default WorkspacePage;
