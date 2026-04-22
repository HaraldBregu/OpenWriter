import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, RotateCcw, Play, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { SectionHeader, SettingRow } from '../components';
import type { ExtensionCommandInfo, ExtensionRuntimeInfo } from '../../../../../shared/types';

type FeedbackStatus = 'idle' | 'success' | 'error';

interface FeedbackState {
	status: FeedbackStatus;
	message: string;
}

const FEEDBACK_IDLE: FeedbackState = { status: 'idle', message: '' };

function extractErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === 'string') return error;
	return '';
}

const ExtensionsPage: React.FC = () => {
	const { t } = useTranslation();
	const [extensions, setExtensions] = useState<ExtensionRuntimeInfo[]>([]);
	const [commands, setCommands] = useState<ExtensionCommandInfo[]>([]);
	const [feedback, setFeedback] = useState<FeedbackState>(FEEDBACK_IDLE);
	const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

	const loadExtensions = useCallback(async () => {
		try {
			const list = await window.extensions.list();
			setExtensions(list);
		} catch {
			setExtensions([]);
		}
	}, []);

	const loadCommands = useCallback(async () => {
		try {
			const next = await window.extensions.getCommands();
			setCommands(next);
		} catch {
			setCommands([]);
		}
	}, []);

	useEffect(() => {
		void Promise.all([loadExtensions(), loadCommands()]);
	}, [loadCommands, loadExtensions]);

	useEffect(() => {
		const unsubscribeRegistry = window.extensions.onRegistryChanged(() => {
			void Promise.all([loadExtensions(), loadCommands()]);
		});
		const unsubscribeRuntime = window.extensions.onRuntimeChanged(() => {
			void loadExtensions();
		});

		return () => {
			unsubscribeRegistry();
			unsubscribeRuntime();
		};
	}, [loadCommands, loadExtensions]);

	const withPending = useCallback(async (id: string, action: () => Promise<void>) => {
		setPendingIds((current) => new Set(current).add(id));
		try {
			await action();
		} finally {
			setPendingIds((current) => {
				const next = new Set(current);
				next.delete(id);
				return next;
			});
		}
	}, []);

	const handleToggle = useCallback(
		async (extensionId: string, enabled: boolean) => {
			setFeedback(FEEDBACK_IDLE);
			try {
				await withPending(extensionId, () => window.extensions.setEnabled(extensionId, enabled));
				await Promise.all([loadExtensions(), loadCommands()]);
			} catch (error) {
				setFeedback({
					status: 'error',
					message: extractErrorMessage(error) || t('settings.extensions.toggleError'),
				});
			}
		},
		[loadCommands, loadExtensions, t, withPending]
	);

	const handleReload = useCallback(
		async (extensionId: string) => {
			setFeedback(FEEDBACK_IDLE);
			try {
				await withPending(extensionId, () => window.extensions.reload(extensionId));
				await Promise.all([loadExtensions(), loadCommands()]);
				setFeedback({
					status: 'success',
					message: t('settings.extensions.reloadSuccess'),
				});
			} catch (error) {
				setFeedback({
					status: 'error',
					message: extractErrorMessage(error) || t('settings.extensions.reloadError'),
				});
			}
		},
		[loadCommands, loadExtensions, t, withPending]
	);

	const handleRunCommand = useCallback(
		async (commandId: string) => {
			setFeedback(FEEDBACK_IDLE);
			try {
				const result = await window.extensions.executeCommand(commandId);
				setFeedback({
					status: result.ok ? 'success' : 'error',
					message: result.ok
						? t('settings.extensions.commandSuccess')
						: result.error || t('settings.extensions.commandError'),
				});
			} catch (error) {
				setFeedback({
					status: 'error',
					message: extractErrorMessage(error) || t('settings.extensions.commandError'),
				});
			}
		},
		[t]
	);

	return (
		<div className="w-full max-w-3xl p-4 sm:p-6">
			<h1 className="text-lg font-normal mb-1">{t('settings.extensions.title')}</h1>
			<p className="text-sm text-muted-foreground mb-6">{t('settings.extensions.subtitle')}</p>

			{feedback.status !== 'idle' && (
				<div
					role={feedback.status === 'error' ? 'alert' : 'status'}
					className={`mb-4 flex items-start gap-3 rounded-md border px-3 py-2.5 text-sm ${
						feedback.status === 'error'
							? 'border-destructive/40 bg-destructive/10 text-destructive'
							: 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400'
					}`}
				>
					{feedback.status === 'error' ? (
						<AlertCircle size={16} className="mt-0.5 shrink-0" />
					) : (
						<CheckCircle size={16} className="mt-0.5 shrink-0" />
					)}
					<span className="flex-1">{feedback.message}</span>
					<button
						type="button"
						onClick={() => setFeedback(FEEDBACK_IDLE)}
						className="rounded p-0.5 transition-colors hover:bg-foreground/10"
						aria-label={t('settings.extensions.dismiss')}
					>
						<X size={14} />
					</button>
				</div>
			)}

			<SectionHeader title={t('settings.extensions.actions')} />
			<div className="flex gap-2 py-3 border-b">
				<Button variant="outline" size="sm" onClick={() => void window.extensions.openFolder()}>
					<FolderOpen size={14} className="mr-1.5" />
					{t('settings.extensions.openFolder')}
				</Button>
			</div>

			<SectionHeader title={t('settings.extensions.installed')} />
			{extensions.length === 0 ? (
				<p className="py-3 text-sm text-muted-foreground">{t('settings.extensions.empty')}</p>
			) : (
				extensions.map((extension) => {
					const isPending = pendingIds.has(extension.id);
					return (
						<SettingRow
							key={extension.id}
							label={extension.name}
							description={
								extension.validationErrors.length > 0
									? extension.validationErrors.join(' ')
									: extension.description || t('settings.extensions.noDescription')
							}
						>
							<div className="flex items-center gap-2">
								<Badge variant="secondary">{extension.source}</Badge>
								<Badge variant="outline">{extension.runtime.status}</Badge>
								<Button
									variant="outline"
									size="sm"
									onClick={() => void handleReload(extension.id)}
									disabled={isPending || extension.validationErrors.length > 0}
								>
									<RotateCcw size={14} className="mr-1.5" />
									{t('settings.extensions.reload')}
								</Button>
								<Switch
									checked={extension.enabled}
									onCheckedChange={(checked) =>
										void handleToggle(extension.id, checked)
									}
									disabled={isPending || extension.validationErrors.length > 0}
								/>
							</div>
						</SettingRow>
					);
				})
			)}

			<SectionHeader title={t('settings.extensions.commands')} />
			{commands.length === 0 ? (
				<p className="py-3 text-sm text-muted-foreground">
					{t('settings.extensions.noCommands')}
				</p>
			) : (
				commands.map((command) => (
					<SettingRow
						key={command.id}
						label={command.title}
						description={`${command.extensionName} - ${command.description}`}
					>
						<Button
							variant="outline"
							size="sm"
							onClick={() => void handleRunCommand(command.id)}
							disabled={!command.enabled}
						>
							<Play size={14} className="mr-1.5" />
							{t('settings.extensions.runCommand')}
						</Button>
					</SettingRow>
				))
			)}
		</div>
	);
};

export default ExtensionsPage;
