import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, RefreshCw } from 'lucide-react';
import type {
	Channel,
	ChannelStatusEvent,
	ChannelType,
	TelegramChannelProperties,
	WhatsappChannelProperties,
	DiscordChannelProperties,
} from '../../../../../shared/types';
import { Button } from '@/components/ui/Button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import {
	PageBody,
	PageContainer,
	PageHeader,
	PageHeaderDescription,
	PageHeaderTitle,
} from '@/components/app/base/page';

interface DraftProperties {
	token: string;
	allowFrom: string;
}

const EMPTY_DRAFT: DraftProperties = { token: '', allowFrom: '' };

const VISIBLE_TYPES: readonly ChannelType[] = ['telegram', 'whatsapp'] as const;

const CHANNEL_LABELS: Record<ChannelType, string> = {
	telegram: 'Telegram',
	whatsapp: 'WhatsApp',
	discord: 'Discord',
};

const STATUS_LABELS: Record<ChannelStatusEvent['status'], string> = {
	connecting: 'Connecting…',
	qr: 'Scan QR',
	connected: 'Connected',
	disconnected: 'Disconnected',
	error: 'Error',
};

const STATUS_COLORS: Record<ChannelStatusEvent['status'], string> = {
	connecting: 'bg-yellow-500',
	qr: 'bg-blue-500',
	connected: 'bg-green-500',
	disconnected: 'bg-gray-400',
	error: 'bg-red-500',
};

function toDraft(
	props: TelegramChannelProperties | WhatsappChannelProperties
): DraftProperties {
	return { token: props.token, allowFrom: props.allowFrom.join(', ') };
}

function parseAllowFrom(raw: string): string[] {
	return raw
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

const ChannelsPage: React.FC = () => {
	const { t } = useTranslation();
	const [channel, setChannel] = useState<Channel | null>(null);
	const [drafts, setDrafts] = useState<Record<ChannelType, DraftProperties>>({
		telegram: EMPTY_DRAFT,
		whatsapp: EMPTY_DRAFT,
		discord: EMPTY_DRAFT,
	});
	const [saving, setSaving] = useState<ReadonlySet<ChannelType>>(() => new Set());
	const [restarting, setRestarting] = useState<ReadonlySet<ChannelType>>(() => new Set());
	const [statuses, setStatuses] = useState<Partial<Record<ChannelType, ChannelStatusEvent>>>({});

	const persisted = useMemo<Record<ChannelType, DraftProperties>>(
		() => ({
			telegram: channel ? toDraft(channel.telegram) : EMPTY_DRAFT,
			whatsapp: channel ? toDraft(channel.whatsapp) : EMPTY_DRAFT,
			discord: channel ? toDraft(channel.discord) : EMPTY_DRAFT,
		}),
		[channel]
	);

	useEffect(() => {
		window.app.getChannel().then(setChannel).catch(() => setChannel(null));
		window.app.getChannelStatus().then(setStatuses).catch(() => setStatuses({}));
		const unsubscribe = window.app.onChannelStatus((event) => {
			setStatuses((prev) => ({ ...prev, [event.type]: event }));
		});
		return unsubscribe;
	}, []);

	useEffect(() => {
		setDrafts(persisted);
	}, [persisted]);

	const handleSave = useCallback(
		async (type: ChannelType) => {
			const draft = drafts[type];
			const persistedForType = persisted[type];
			if (
				draft.token === persistedForType.token &&
				draft.allowFrom === persistedForType.allowFrom
			) {
				return;
			}

			setSaving((prev) => new Set(prev).add(type));
			try {
				const properties = {
					token: draft.token.trim(),
					allowFrom: parseAllowFrom(draft.allowFrom),
				};
				const next =
					type === 'telegram'
						? await window.app.setChannelProperties('telegram', properties)
						: await window.app.setChannelProperties('whatsapp', properties);
				setChannel(next);
				await window.app.restartChannel(type);
			} finally {
				setSaving((prev) => {
					const next = new Set(prev);
					next.delete(type);
					return next;
				});
			}
		},
		[drafts, persisted]
	);

	const handleRestart = useCallback(async (type: ChannelType) => {
		setRestarting((prev) => new Set(prev).add(type));
		try {
			await window.app.restartChannel(type);
		} finally {
			setRestarting((prev) => {
				const next = new Set(prev);
				next.delete(type);
				return next;
			});
		}
	}, []);

	return (
		<PageContainer>
			<PageHeader className="px-0 border-none">
				<PageHeaderTitle>{t('settings.channels.title', 'Channels')}</PageHeaderTitle>
				<PageHeaderDescription>
					{t(
						'settings.channels.subtitle',
						'Configure messaging channels (Telegram, WhatsApp).'
					)}
				</PageHeaderDescription>
			</PageHeader>
			<PageBody className="px-0">
				<FieldGroup className="max-w-2xl">
					{VISIBLE_TYPES.map((type) => {
						const isSaving = saving.has(type);
						const isRestarting = restarting.has(type);
						const draft = drafts[type] ?? EMPTY_DRAFT;
						const persistedForType = persisted[type];
						const isDirty =
							draft.token !== persistedForType.token ||
							draft.allowFrom !== persistedForType.allowFrom;
						const status = statuses[type];

						return (
							<form
								key={type}
								onSubmit={(e) => {
									e.preventDefault();
									void handleSave(type);
								}}
								className="border-b py-4"
							>
								<div className="mb-2 flex items-center justify-between">
									<FieldLabel className="block text-sm font-medium">
										{CHANNEL_LABELS[type]}
									</FieldLabel>
									{status && (
										<span className="flex items-center gap-2 text-xs text-muted-foreground">
											<span
												className={`inline-block h-2 w-2 rounded-full ${STATUS_COLORS[status.status]}`}
											/>
											{STATUS_LABELS[status.status]}
										</span>
									)}
								</div>

								{type === 'whatsapp' ? (
									<>
										<Field>
											<FieldLabel htmlFor={`channel-${type}-allow`}>
												{t('settings.channels.allowFrom', 'Allowed senders (comma-separated)')}
											</FieldLabel>
											<Field orientation="horizontal">
												<Input
													id={`channel-${type}-allow`}
													type="text"
													value={draft.allowFrom}
													onChange={(e) =>
														setDrafts((prev) => ({
															...prev,
															[type]: { ...prev[type], allowFrom: e.target.value },
														}))
													}
													placeholder="e.g. 1234567890@s.whatsapp.net"
													autoComplete="off"
													spellCheck={false}
													disabled={isSaving}
												/>
												<Button
													type="submit"
													size="icon"
													disabled={!isDirty || isSaving}
													aria-label={t('common.save', 'Save')}
												>
													{isSaving ? <Spinner /> : <Save />}
												</Button>
											</Field>
										</Field>

										<div className="mt-4 flex flex-col items-start gap-3">
											{status?.status === 'qr' && status.qrDataUrl && (
												<div className="flex flex-col items-start gap-2">
													<span className="text-xs text-muted-foreground">
														{t(
															'settings.channels.scanQr',
															'Open WhatsApp → Linked devices → Link a device, then scan:'
														)}
													</span>
													<img
														src={status.qrDataUrl}
														alt="WhatsApp pairing QR"
														className="h-56 w-56 rounded border border-border bg-white p-2"
													/>
												</div>
											)}
											{status?.status === 'error' && status.error && (
												<span className="text-xs text-red-500">{status.error}</span>
											)}
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={isRestarting}
												onClick={() => void handleRestart('whatsapp')}
											>
												{isRestarting ? (
													<Spinner />
												) : (
													<>
														<RefreshCw className="mr-1 h-3 w-3" />
														{status?.status === 'connected'
															? t('settings.channels.reconnect', 'Reconnect')
															: t('settings.channels.pair', 'Pair / Connect')}
													</>
												)}
											</Button>
										</div>
									</>
								) : (
									<>
										<Field>
											<FieldLabel htmlFor={`channel-${type}-token`}>
												{t('settings.channels.token', 'Token')}
											</FieldLabel>
											<Input
												id={`channel-${type}-token`}
												type="password"
												value={draft.token}
												onChange={(e) =>
													setDrafts((prev) => ({
														...prev,
														[type]: { ...prev[type], token: e.target.value },
													}))
												}
												placeholder={t('settings.channels.tokenPlaceholder', 'Enter token…')}
												autoComplete="off"
												spellCheck={false}
												disabled={isSaving}
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor={`channel-${type}-allow`}>
												{t(
													'settings.channels.allowFrom',
													'Allowed senders (comma-separated)'
												)}
											</FieldLabel>
											<Field orientation="horizontal">
												<Input
													id={`channel-${type}-allow`}
													type="text"
													value={draft.allowFrom}
													onChange={(e) =>
														setDrafts((prev) => ({
															...prev,
															[type]: { ...prev[type], allowFrom: e.target.value },
														}))
													}
													placeholder="e.g. user1, user2"
													autoComplete="off"
													spellCheck={false}
													disabled={isSaving}
												/>
												<Button
													type="submit"
													size="icon"
													disabled={!isDirty || isSaving}
													aria-label={t('common.save', 'Save')}
												>
													{isSaving ? <Spinner /> : <Save />}
												</Button>
											</Field>
										</Field>
										{status?.status === 'error' && status.error && (
											<span className="mt-2 block text-xs text-red-500">{status.error}</span>
										)}
									</>
								)}
							</form>
						);
					})}
				</FieldGroup>
			</PageBody>
		</PageContainer>
	);
};

export default ChannelsPage;
