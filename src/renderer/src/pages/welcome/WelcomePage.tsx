import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Clock, X, AlertTriangle } from 'lucide-react';
import { AppButton, AppIconOpenWriter } from '@/components/app';
import { AppTitleBar } from '@/components/app/base/AppTitleBar';
import {
	useWorkspaceDeletionReason,
	useClearDeletionReason,
} from '@/hooks/use-workspace-validation';

interface RecentProject {
	path: string;
	lastOpened: number;
	exists?: boolean;
}

interface WelcomePageProps {}

const WelcomePage: React.FC<WelcomePageProps> = () => {
	const navigate = useNavigate();
	const { t } = useTranslation();
	const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
	const deletionReason = useWorkspaceDeletionReason();
	const clearDeletion = useClearDeletionReason();

	const loadRecentProjects = useCallback(async () => {
		try {
			const projects = await window.workspace.getRecent();
			const validProjects = projects.filter((project) => typeof project.path === 'string');
			const projectsWithExistence = await Promise.all(
				validProjects.map(async (project) => {
					try {
						const exists = await window.workspace.directoryExists(project.path);
						return { ...project, exists };
					} catch {
						return { ...project, exists: false };
					}
				})
			);

			setRecentProjects(projectsWithExistence);
		} catch (error) {
			console.error('Failed to load recent projects:', error);
			setRecentProjects([]);
		}
	}, []);

	useEffect(() => {
		void loadRecentProjects();
	}, [loadRecentProjects]);

	const handleOpenProject = useCallback(async () => {
		try {
			const folderPath = await window.workspace.selectFolder();

			if (folderPath) {
				await window.workspace.setCurrent(folderPath);
				navigate('/home');
			}
		} catch (error) {
			console.error('Failed to open project:', error);
		}
	}, [navigate]);

	const handleOpenRecentProject = useCallback(
		async (path: string, exists: boolean) => {
			if (!exists) {
				return;
			}

			try {
				await window.workspace.setCurrent(path);
				navigate('/home');
			} catch (error) {
				console.error('Failed to open recent project:', error);
			}
		},
		[navigate]
	);

	const handleRemoveRecentProject = useCallback(
		async (path: string, event: React.MouseEvent) => {
			event.stopPropagation();

			try {
				await window.workspace.removeRecent(path);
				await loadRecentProjects();
			} catch (error) {
				console.error('Failed to remove recent project:', error);
			}
		},
		[loadRecentProjects]
	);

	const formatPath = (path: string) => {
		if (typeof path !== 'string') return '';
		if (path.includes('/Users/')) {
			const parts = path.split('/Users/');
			if (parts[1]) return '~/' + parts[1].split('/').slice(1).join('/');
		}
		if (path.includes('/home/')) {
			const parts = path.split('/home/');
			if (parts[1]) return '~/' + parts[1].split('/').slice(1).join('/');
		}
		if (path.includes('\\Users\\')) {
			const parts = path.split('\\Users\\');
			if (parts[1]) return '~\\' + parts[1].split('\\').slice(1).join('\\');
		}
		return path;
	};

	const getProjectName = (path: string) => {
		if (typeof path !== 'string') return '';
		return path.split(/[/\\]/).pop() || path;
	};

	const formatRelativeTime = (timestamp: number) => {
		const seconds = Math.floor((Date.now() - timestamp) / 1000);
		if (seconds < 60) return 'just now';
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		if (days === 1) return 'yesterday';
		if (days < 7) return `${days}d ago`;
		return `${Math.floor(days / 7)}w ago`;
	};

	return (
		<div className="flex flex-col h-screen bg-background">
			<AppTitleBar title="OpenWriter" />

			{deletionReason && (
				<div className="mx-8 mt-4 mb-0 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
					<AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
					<p className="flex-1 text-sm text-foreground">
						{deletionReason === 'inaccessible'
							? t('workspace.inaccessibleBanner')
							: t('workspace.deletedBanner')}
					</p>
					<button
						onClick={clearDeletion}
						aria-label={t('common.close')}
						className="h-6 w-6 rounded-md hover:bg-destructive/10 flex items-center justify-center transition-colors shrink-0"
					>
						<X className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
					</button>
				</div>
			)}

			<div className="flex flex-col items-center flex-1 px-8 py-12 overflow-y-auto">
				<div className="flex flex-col items-center mb-10">
					<AppIconOpenWriter
						className="mb-5 text-foreground"
						style={{
							width: 'clamp(104px, min(18vw, 18vh), 196px)',
							height: 'clamp(104px, min(18vw, 18vh), 196px)',
						}}
						aria-label={t('appTitle')}
						role="img"
					/>
					<h1 className="text-3xl font-semibold text-foreground mb-2 tracking-tight">
						{t('appTitle')}
					</h1>
					<p className="text-sm text-muted-foreground text-center max-w-xs leading-relaxed">
						{t('welcome.tagline')}
					</p>
					<p className="mt-3 text-xs text-muted-foreground">
						{t('welcome.freePlan')} &bull;{' '}
						<span className="text-primary cursor-pointer hover:underline">
							{t('welcome.upgradeToPro')}
						</span>
					</p>
				</div>

				<div className="w-full max-w-2xl mb-8">
					<div className="rounded-xl border border-border p-6 flex items-center justify-between gap-6">
						<div className="flex flex-col gap-2">
							<h2 className="text-lg font-semibold text-foreground">
								{t('welcome.openWorkspace')}
							</h2>
							<p className="text-sm text-muted-foreground">
								{t('welcome.openWorkspaceDescription')}
							</p>
						</div>

						<AppButton
							variant="outline"
							className="h-14 px-6 flex items-center gap-3 rounded-lg border-border hover:bg-accent hover:border-accent-foreground/20 transition-colors shrink-0"
							onClick={handleOpenProject}
						>
							<FolderOpen className="h-5 w-5 text-foreground/70" />
							<span className="text-sm font-medium">{t('welcome.browse')}</span>
						</AppButton>
					</div>
				</div>

				{recentProjects.length > 0 && (
					<div className="w-full max-w-2xl flex flex-col min-h-0">
						<div className="flex items-center justify-between mb-3">
							<h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
								{t('welcome.recentProjects')}
							</h2>
							<span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
								{t('welcome.viewAll')}
							</span>
						</div>

						<div className="rounded-xl border border-border overflow-y-auto max-h-96">
							{recentProjects.slice(0, 5).map((project, index) => {
								const exists = project.exists !== false;

								return (
									<div
										key={index}
										className={`
                    flex items-center justify-between px-4 py-3
                    transition-colors
                    ${index !== 0 ? 'border-t border-border' : ''}
                    ${exists ? 'hover:bg-accent opacity-100' : 'opacity-40'}
                  `}
									>
										<button
											onClick={() => handleOpenRecentProject(project.path, exists)}
											disabled={!exists}
											className={`
                      flex items-center gap-4 flex-1 min-w-0
                      ${exists ? 'cursor-pointer' : 'cursor-not-allowed'}
                    `}
										>
											<div className="h-8 w-8 rounded-md flex items-center justify-center shrink-0 bg-primary/10">
												<FolderOpen className="h-4 w-4 text-primary" />
											</div>

											<div className="flex flex-col items-start min-w-0">
												<span className="text-sm font-medium truncate text-foreground text-left">
													{getProjectName(project.path)}
													{!exists && ` ${t('welcome.notFound')}`}
												</span>
												<span className="text-xs truncate mt-0.5 text-muted-foreground text-left">
													{formatPath(project.path)}
												</span>
											</div>
										</button>

										<div className="flex items-center gap-2 shrink-0">
											<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
												<Clock className="h-3 w-3" />
												<span>{formatRelativeTime(project.lastOpened)}</span>
											</div>

											<button
												onClick={(event) => handleRemoveRecentProject(project.path, event)}
												className="h-8 w-8 rounded-md hover:bg-accent/50 flex items-center justify-center transition-colors"
												title={t('welcome.removeFromRecent')}
											>
												<X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
											</button>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default WelcomePage;
