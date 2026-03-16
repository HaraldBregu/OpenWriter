import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectWorkspaceInfo } from '@/../../preload/index.d';
import { AppInput } from '@/components/app/AppInput';
import { AppTextarea } from '@/components/app/AppTextarea';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EditingField = 'name' | 'description' | null;

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

// ---------------------------------------------------------------------------
// Inline editable field components
// ---------------------------------------------------------------------------

interface InlineTextFieldProps {
	fieldKey: EditingField & ('name' | 'description');
	value: string;
	placeholder: string;
	editingField: EditingField;
	isSaving: boolean;
	onStartEdit: (field: EditingField & ('name' | 'description')) => void;
	onCommit: (field: 'name' | 'description', value: string) => void;
	onCancel: () => void;
}

const InlineTextField: React.FC<InlineTextFieldProps> = ({
	fieldKey,
	value,
	placeholder,
	editingField,
	isSaving,
	onStartEdit,
	onCommit,
	onCancel,
}) => {
	const [draft, setDraft] = useState(value);
	const isEditing = editingField === fieldKey;

	// Keep draft in sync when external value changes (e.g. after save)
	useEffect(() => {
		if (!isEditing) {
			setDraft(value);
		}
	}, [value, isEditing]);

	const handleClick = useCallback(() => {
		setDraft(value);
		onStartEdit(fieldKey);
	}, [value, fieldKey, onStartEdit]);

	const handleBlur = useCallback(() => {
		onCommit(fieldKey, draft);
	}, [fieldKey, draft, onCommit]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				onCommit(fieldKey, draft);
			} else if (e.key === 'Escape') {
				onCancel();
			}
		},
		[fieldKey, draft, onCommit, onCancel]
	);

	if (isEditing) {
		return (
			<AppInput
				autoFocus
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={handleBlur}
				onKeyDown={handleKeyDown}
				disabled={isSaving}
				className="h-6 px-1.5 py-0 text-xs font-mono w-64 max-w-full"
				aria-label={placeholder}
			/>
		);
	}

	return (
		<button
			type="button"
			onClick={handleClick}
			className="font-mono text-xs truncate max-w-xs text-left hover:text-foreground hover:underline underline-offset-2 transition-colors cursor-text"
			title={value || placeholder}
			aria-label={`${placeholder}: ${value || placeholder}`}
		>
			{value || <span className="text-muted-foreground/50 italic">{placeholder}</span>}
		</button>
	);
};

interface InlineTextareaFieldProps {
	fieldKey: EditingField & 'description';
	value: string;
	placeholder: string;
	editingField: EditingField;
	isSaving: boolean;
	onStartEdit: (field: EditingField & 'description') => void;
	onCommit: (field: 'description', value: string) => void;
	onCancel: () => void;
}

const InlineTextareaField: React.FC<InlineTextareaFieldProps> = ({
	fieldKey,
	value,
	placeholder,
	editingField,
	isSaving,
	onStartEdit,
	onCommit,
	onCancel,
}) => {
	const [draft, setDraft] = useState(value);
	const isEditing = editingField === fieldKey;
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		if (!isEditing) {
			setDraft(value);
		}
	}, [value, isEditing]);

	useEffect(() => {
		if (isEditing && textareaRef.current) {
			textareaRef.current.focus();
			// Move cursor to end
			const len = textareaRef.current.value.length;
			textareaRef.current.setSelectionRange(len, len);
		}
	}, [isEditing]);

	const handleClick = useCallback(() => {
		setDraft(value);
		onStartEdit(fieldKey);
	}, [value, fieldKey, onStartEdit]);

	const handleBlur = useCallback(() => {
		onCommit(fieldKey, draft);
	}, [fieldKey, draft, onCommit]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Escape') {
				onCancel();
			}
			// Allow Enter for newlines — user blurs or presses Escape to finish
		},
		[onCancel]
	);

	if (isEditing) {
		return (
			<AppTextarea
				ref={textareaRef}
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={handleBlur}
				onKeyDown={handleKeyDown}
				disabled={isSaving}
				rows={3}
				className="text-xs font-mono w-64 max-w-full resize-none py-1 px-1.5"
				aria-label={placeholder}
			/>
		);
	}

	return (
		<button
			type="button"
			onClick={handleClick}
			className="font-mono text-xs text-right max-w-xs truncate hover:text-foreground hover:underline underline-offset-2 transition-colors cursor-text"
			title={value || placeholder}
			aria-label={`${placeholder}: ${value || placeholder}`}
		>
			{value || <span className="text-muted-foreground/50 italic">{placeholder}</span>}
		</button>
	);
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const GeneralSettingsPage: React.FC = () => {
	const { t } = useTranslation();

	const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(null);
	const [projectInfo, setProjectInfo] = useState<ProjectWorkspaceInfo | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const [editingField, setEditingField] = useState<EditingField>(null);
	const [isSaving, setIsSaving] = useState(false);

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

	const handleStartEdit = useCallback((field: 'name' | 'description') => {
		setEditingField(field);
	}, []);

	const handleCancel = useCallback(() => {
		setEditingField(null);
	}, []);

	const handleCommit = useCallback(
		(field: 'name' | 'description', value: string) => {
			const trimmed = value.trim();
			const current = field === 'name' ? projectInfo?.name : projectInfo?.description;

			// No change — just close the editor
			if (trimmed === (current ?? '')) {
				setEditingField(null);
				return;
			}

			setIsSaving(true);

			const apiCall =
				field === 'name'
					? window.workspace.updateProjectName(trimmed)
					: window.workspace.updateProjectDescription(trimmed);

			apiCall
				.then((updated) => {
					setProjectInfo(updated);
				})
				.catch(() => {
					// Leave the field in its previous state on error
				})
				.finally(() => {
					setIsSaving(false);
					setEditingField(null);
				});
		},
		[projectInfo]
	);

	return (
		<div className="mx-auto w-full p-6 space-y-8">
			<div>
				<h1 className="text-lg font-normal">{t('settings.title')}</h1>
				<p className="text-sm text-muted-foreground">{t('settings.description')}</p>
			</div>

			{/* Workspace */}
			<section className="space-y-3">
				<h2 className="text-sm font-normal text-muted-foreground">
					{t('settings.sections.workspace')}
				</h2>
				<div className="rounded-md border divide-y text-sm">
					{/* Current path */}
					<div className="flex justify-between items-center px-4 py-2.5">
						<span className="text-muted-foreground shrink-0">
							{t('settings.workspace.currentWorkspace')}
						</span>
						<span
							className="font-mono text-xs truncate max-w-md ml-4"
							title={currentWorkspace || t('settings.workspace.notSet')}
						>
							{isLoading ? (
								<span className="text-muted-foreground/50">
									{t('settings.workspace.loading')}
								</span>
							) : (
								currentWorkspace || t('settings.workspace.notSet')
							)}
						</span>
					</div>

					{/* Project info rows — only rendered when a workspace is active */}
					{!isLoading && currentWorkspace && projectInfo && (
						<>
							{/* Project name (editable) */}
							<div className="flex justify-between items-center px-4 py-2.5">
								<span className="text-muted-foreground shrink-0">
									{t('settings.workspace.projectName')}
								</span>
								<div className="ml-4 flex justify-end">
									<InlineTextField
										fieldKey="name"
										value={projectInfo.name}
										placeholder={t('settings.workspace.projectNamePlaceholder')}
										editingField={editingField}
										isSaving={isSaving}
										onStartEdit={handleStartEdit}
										onCommit={handleCommit}
										onCancel={handleCancel}
									/>
								</div>
							</div>

							{/* Description (editable) */}
							<div className="flex justify-between items-start px-4 py-2.5">
								<span className="text-muted-foreground shrink-0 pt-0.5">
									{t('settings.workspace.projectDescription')}
								</span>
								<div className="ml-4 flex justify-end">
									<InlineTextareaField
										fieldKey="description"
										value={projectInfo.description}
										placeholder={t('settings.workspace.projectDescriptionPlaceholder')}
										editingField={editingField}
										isSaving={isSaving}
										onStartEdit={handleStartEdit}
										onCommit={handleCommit}
										onCancel={handleCancel}
									/>
								</div>
							</div>

							{/* Project ID */}
							<div className="flex justify-between items-center px-4 py-2.5">
								<span className="text-muted-foreground shrink-0">
									{t('settings.workspace.projectId')}
								</span>
								<span className="font-mono text-xs truncate max-w-xs ml-4 text-muted-foreground/70">
									{projectInfo.projectId}
								</span>
							</div>

							{/* Agent count */}
							<div className="flex justify-between items-center px-4 py-2.5">
								<span className="text-muted-foreground shrink-0">
									{t('settings.workspace.agents')}
								</span>
								<span className="font-mono text-xs ml-4">
									{t('settings.workspace.agentsConfigured', {
										count: projectInfo.agents.length,
									})}
								</span>
							</div>

							{/* Created at */}
							<div className="flex justify-between items-center px-4 py-2.5">
								<span className="text-muted-foreground shrink-0">
									{t('settings.workspace.createdAt')}
								</span>
								<span className="font-mono text-xs ml-4">
									{formatDate(projectInfo.createdAt)}
								</span>
							</div>

							{/* Updated at */}
							<div className="flex justify-between items-center px-4 py-2.5">
								<span className="text-muted-foreground shrink-0">
									{t('settings.workspace.updatedAt')}
								</span>
								<span className="font-mono text-xs ml-4">
									{formatDate(projectInfo.updatedAt)}
								</span>
							</div>

							{/* App version */}
							<div className="flex justify-between items-center px-4 py-2.5">
								<span className="text-muted-foreground shrink-0">
									{t('settings.workspace.appVersion')}
								</span>
								<span className="font-mono text-xs ml-4">{projectInfo.appVersion}</span>
							</div>

							{/* Schema version */}
							<div className="flex justify-between items-center px-4 py-2.5">
								<span className="text-muted-foreground shrink-0">
									{t('settings.workspace.schemaVersion')}
								</span>
								<span className="font-mono text-xs ml-4">{projectInfo.version}</span>
							</div>
						</>
					)}
				</div>
			</section>

			{/* System */}
			<section className="space-y-3">
				<h2 className="text-sm font-normal text-muted-foreground">
					{t('settings.sections.system')}
				</h2>
				<div className="rounded-md border divide-y text-sm">
					<div className="flex justify-between px-4 py-2.5">
						<span className="text-muted-foreground">{t('settings.systemInfo.platform')}</span>
						<span className="font-mono text-xs">{navigator.platform}</span>
					</div>
					<div className="flex justify-between px-4 py-2.5">
						<span className="text-muted-foreground">{t('settings.systemInfo.language')}</span>
						<span className="font-mono text-xs">{navigator.language}</span>
					</div>
				</div>
			</section>
		</div>
	);
};

export default GeneralSettingsPage;
