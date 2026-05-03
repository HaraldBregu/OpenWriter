import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen } from 'lucide-react';
import type { ProjectWorkspaceInfo } from '../../../../../shared/types';
import { Input } from '@/components/ui/Input';
import {
	ItemRow,
	ItemRowActions,
	ItemRowContent,
	ItemRowTitle,
	ItemRowDescription,
} from '@/components/ui/ItemRow';
import { useAppDispatch } from '@/store';
import { loadProjectName } from '@/store/workspace/actions';
import { SectionHeader } from '../components';

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
				reduxDispatch(loadProjectName());
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

	useEffect(() => {
		if (editingField === 'description' && descriptionInputRef.current) {
			descriptionInputRef.current.focus();
			const len = descriptionInputRef.current.value.length;
			descriptionInputRef.current.setSelectionRange(len, len);
		}
	}, [editingField]);

	return (
		<div className="w-full max-w-2xl" aria-busy={isSaving}>
			<h1 className="text-lg font-normal mb-6">{t('workspacePage.title')}</h1>

			{loadError && (
				<p className="text-sm text-destructive mb-4" role="alert">
					{t('workspacePage.loadError')}
				</p>
			)}

			{saveError && (
				<p className="text-sm text-destructive mb-4" role="alert">
					{t('workspacePage.saveError')}
				</p>
			)}

			<SectionHeader title={t('workspacePage.sections.baseInfo')} />

			<div className="flex flex-col gap-2">
				<ItemRow variant="bottom-bordered" size="none">
					<ItemRowContent>
						<ItemRowTitle>{t('workspacePage.path')}</ItemRowTitle>
						<ItemRowDescription>{t('workspacePage.pathDescription')}</ItemRowDescription>
					</ItemRowContent>
					<ItemRowActions>
						<span
							className="font-mono text-xs truncate max-w-xs inline-block text-muted-foreground"
							title={currentWorkspace ?? t('workspacePage.notSet')}
							aria-live="polite"
							aria-atomic="true"
						>
							{isLoading
								? t('workspacePage.loading')
								: (currentWorkspace ?? t('workspacePage.notSet'))}
						</span>
						{!isLoading && currentWorkspace && (
							<button
								type="button"
								onClick={() => window.workspace.openWorkspaceFolder()}
								className="shrink-0 rounded p-1 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
								aria-label={t('common.openFolder')}
								title={t('common.openFolder')}
							>
								<FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
							</button>
						)}
					</ItemRowActions>
				</ItemRow>

				{!isLoading && currentWorkspace && projectInfo && (
					<>
						<ItemRow variant="bottom-bordered" size="none">
							<ItemRowContent>
								<ItemRowTitle>{t('workspacePage.name')}</ItemRowTitle>
								<ItemRowDescription>{t('workspacePage.nameDescription')}</ItemRowDescription>
							</ItemRowContent>
							<ItemRowActions>
								{editingField === 'name' ? (
									<Input
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
							</ItemRowActions>
						</ItemRow>

						<ItemRow variant="bottom-bordered" size="none">
							<ItemRowContent>
								<ItemRowTitle>{t('workspacePage.descriptionLabel')}</ItemRowTitle>
								<ItemRowDescription>
									{t('workspacePage.descriptionDescription')}
								</ItemRowDescription>
							</ItemRowContent>
							<ItemRowActions>
								{editingField === 'description' ? (
									<Input
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
							</ItemRowActions>
						</ItemRow>

						<ItemRow variant="bottom-bordered" size="none">
							<ItemRowContent>
								<ItemRowTitle>{t('workspacePage.projectId')}</ItemRowTitle>
								<ItemRowDescription>
									{t('workspacePage.projectIdDescription')}
								</ItemRowDescription>
							</ItemRowContent>
							<ItemRowActions>
								<span className="font-mono text-xs text-muted-foreground truncate max-w-[14rem] inline-block">
									{projectInfo.projectId}
								</span>
							</ItemRowActions>
						</ItemRow>
					</>
				)}
			</div>

			{!isLoading && currentWorkspace && projectInfo && (
				<>
					<SectionHeader title={t('workspacePage.sections.versioning')} />

					<div className="flex flex-col gap-2">
						<ItemRow variant="bottom-bordered" size="none">
							<ItemRowContent>
								<ItemRowTitle>{t('workspacePage.schemaVersion')}</ItemRowTitle>
								<ItemRowDescription>
									{t('workspacePage.schemaVersionDescription')}
								</ItemRowDescription>
							</ItemRowContent>
							<ItemRowActions>
								<span className="font-mono text-sm">{projectInfo.version}</span>
							</ItemRowActions>
						</ItemRow>

						<ItemRow variant="bottom-bordered" size="none">
							<ItemRowContent>
								<ItemRowTitle>{t('workspacePage.appVersion')}</ItemRowTitle>
								<ItemRowDescription>
									{t('workspacePage.appVersionDescription')}
								</ItemRowDescription>
							</ItemRowContent>
							<ItemRowActions>
								<span className="font-mono text-sm">{projectInfo.appVersion}</span>
							</ItemRowActions>
						</ItemRow>

						<ItemRow variant="bottom-bordered" size="none">
							<ItemRowContent>
								<ItemRowTitle>{t('workspacePage.createdAt')}</ItemRowTitle>
								<ItemRowDescription>
									{t('workspacePage.createdAtDescription')}
								</ItemRowDescription>
							</ItemRowContent>
							<ItemRowActions>
								<span className="text-sm">{formatDate(projectInfo.createdAt)}</span>
							</ItemRowActions>
						</ItemRow>

						<ItemRow variant="bottom-bordered" size="none">
							<ItemRowContent>
								<ItemRowTitle>{t('workspacePage.updatedAt')}</ItemRowTitle>
								<ItemRowDescription>
									{t('workspacePage.updatedAtDescription')}
								</ItemRowDescription>
							</ItemRowContent>
							<ItemRowActions>
								<span className="text-sm">{formatDate(projectInfo.updatedAt)}</span>
							</ItemRowActions>
						</ItemRow>
					</div>
				</>
			)}
		</div>
	);
};

export default WorkspacePage;
