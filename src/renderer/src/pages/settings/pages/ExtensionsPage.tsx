import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	FolderOpen,
	RotateCcw,
	Play,
	AlertCircle,
	CheckCircle,
	X,
	PackagePlus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { Input } from '@/components/ui/Input';
import { SectionHeader, SettingRow } from '../components';
import type {
	ExtensionCommandInfo,
	ExtensionPreferenceContribution,
	ExtensionRuntimeInfo,
} from '../../../../../shared/types';

type FeedbackStatus = 'idle' | 'success' | 'error';

interface FeedbackState {
	status: FeedbackStatus;
	message: string;
}

interface ExtensionPreferenceState {
	definitions: ExtensionPreferenceContribution[];
	values: Record<string, unknown>;
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
	const [preferences, setPreferences] = useState<Record<string, ExtensionPreferenceState>>({});
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

	const loadPreferences = useCallback(async (extensionList: ExtensionRuntimeInfo[]) => {
		const entries = await Promise.all(
			extensionList.map(async (extension) => {
				try {
					const next = await window.extensions.getPreferences(extension.id);
					return [extension.id, next] as const;
				} catch {
					return [extension.id, { definitions: [], values: {} }] as const;
				}
			})
		);
		setPreferences(Object.fromEntries(entries));
	}, []);

	useEffect(() => {
		void Promise.all([loadExtensions(), loadCommands()]);
	}, [loadCommands, loadExtensions]);

	useEffect(() => {
		void loadPreferences(extensions);
	}, [extensions, loadPreferences]);

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

	const handleInstallLocal = useCallback(async () => {
		setFeedback(FEEDBACK_IDLE);
		try {
			const installed = await window.extensions.installLocal();
			if (!installed) return;
			await Promise.all([loadExtensions(), loadCommands()]);
			setFeedback({
				status: 'success',
				message: t('settings.extensions.installSuccess', { name: installed.name }),
			});
		} catch (error) {
			setFeedback({
				status: 'error',
				message: extractErrorMessage(error) || t('settings.extensions.installError'),
			});
		}
	}, [loadCommands, loadExtensions, t]);

	const updateLocalPreference = useCallback(
		(extensionId: string, preference: ExtensionPreferenceContribution, value: string | boolean) => {
			setPreferences((current) => {
				const currentState = current[extensionId] ?? { definitions: [], values: {} };
				return {
					...current,
					[extensionId]: {
						...currentState,
						values: {
							...currentState.values,
							[preference.id]: value,
						},
					},
				};
			});
		},
		[]
	);

	const handlePreferenceChange = useCallback(
		async (
			extensionId: string,
			preference: ExtensionPreferenceContribution,
			value: string | boolean
		) => {
			updateLocalPreference(extensionId, preference, value);

			try {
				await window.extensions.setPreference(extensionId, preference.id, value);
				await Promise.all([loadExtensions(), loadCommands()]);
			} catch (error) {
				setFeedback({
					status: 'error',
					message: extractErrorMessage(error) || t('settings.extensions.preferenceError'),
				});
			}
		},
		[loadCommands, loadExtensions, t, updateLocalPreference]
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
				<Button variant="outline" size="sm" onClick={() => void handleInstallLocal()}>
					<PackagePlus size={14} className="mr-1.5" />
					{t('settings.extensions.installLocal')}
				</Button>
			</div>

			<SectionHeader title={t('settings.extensions.installed')} />
			{extensions.length === 0 ? (
				<p className="py-3 text-sm text-muted-foreground">{t('settings.extensions.empty')}</p>
			) : (
				extensions.map((extension) => {
					const isPending = pendingIds.has(extension.id);
					return (
						<div key={extension.id} className="border-b">
							<SettingRow
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
										onCheckedChange={(checked) => void handleToggle(extension.id, checked)}
										disabled={isPending || extension.validationErrors.length > 0}
									/>
								</div>
							</SettingRow>
							{preferences[extension.id]?.definitions.length ? (
								<div className="space-y-3 pb-4 pl-4 pr-1">
									<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
										{t('settings.extensions.preferences')}
									</p>
									{preferences[extension.id].definitions.map((preference) => {
										const value = preferences[extension.id].values[preference.id];
										const description =
											preference.description ||
											(preference.required ? t('settings.extensions.requiredPreference') : '');

										return (
											<div
												key={preference.id}
												className="grid gap-2 sm:grid-cols-[minmax(160px,220px)_1fr]"
											>
												<div>
													<p className="text-sm font-medium">{preference.title}</p>
													{description ? (
														<p className="text-xs text-muted-foreground">{description}</p>
													) : null}
												</div>
												{preference.type === 'checkbox' ? (
													<Switch
														checked={Boolean(value)}
														onCheckedChange={(checked) =>
															void handlePreferenceChange(extension.id, preference, checked)
														}
													/>
												) : preference.type === 'dropdown' ? (
													<select
														className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
														value={typeof value === 'string' ? value : ''}
														onChange={(event) =>
															void handlePreferenceChange(
																extension.id,
																preference,
																event.target.value
															)
														}
													>
														<option value="">{t('settings.extensions.selectPreference')}</option>
														{preference.options?.map((option) => (
															<option key={option.value} value={option.value}>
																{option.label}
															</option>
														))}
													</select>
												) : (
													<Input
														type={preference.type === 'password' ? 'password' : 'text'}
														value={typeof value === 'string' ? value : ''}
														placeholder={preference.placeholder}
														onChange={(event) =>
															updateLocalPreference(extension.id, preference, event.target.value)
														}
														onBlur={(event) =>
															void handlePreferenceChange(
																extension.id,
																preference,
																event.target.value
															)
														}
													/>
												)}
											</div>
										);
									})}
								</div>
							) : null}
						</div>
					);
				})
			)}

			<SectionHeader title={t('settings.extensions.commands')} />
			{commands.length === 0 ? (
				<p className="py-3 text-sm text-muted-foreground">{t('settings.extensions.noCommands')}</p>
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
