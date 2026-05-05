import { useEffect, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, RefreshCw, KeyRound, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Separator } from '@/components/ui/Separator';
import { Spinner } from '@/components/ui/Spinner';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/Tooltip';
import { H3, Muted } from '@/components/ui/Typography';
import type { ChannelStatusEvent } from '../../../../../../shared/types';
import { ChannelsProvider, useChannelsContext } from './Provider';

function InfoHint({ text }: { readonly text: string }): ReactElement {
	return (
		<Tooltip>
			<TooltipTrigger
				type="button"
				aria-label={text}
				className="inline-flex items-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
			>
				<Info className="size-3.5" />
			</TooltipTrigger>
			<TooltipContent>{text}</TooltipContent>
		</Tooltip>
	);
}

const STATUS_COLORS: Record<ChannelStatusEvent['status'], string> = {
	connecting: 'bg-yellow-500',
	pairing_code: 'bg-blue-500',
	connected: 'bg-green-500',
	disconnected: 'bg-gray-400',
	error: 'bg-red-500',
};

function Bootstrap(): null {
	const { setChannel, setStatuses, patchStatus, setDrafts, persisted } = useChannelsContext();

	useEffect(() => {
		let active = true;

		window.app
			.getChannel()
			.then((channel) => {
				if (active) setChannel(channel);
			})
			.catch(() => {
				if (active) setChannel(null);
			});

		window.app
			.getChannelStatus()
			.then((statuses) => {
				if (active) setStatuses(statuses);
			})
			.catch(() => {
				if (active) setStatuses({});
			});

		const unsubscribe = window.app.onChannelStatus((event) => {
			patchStatus(event);
		});

		return () => {
			active = false;
			unsubscribe();
		};
	}, [setChannel, setStatuses, patchStatus]);

	useEffect(() => {
		setDrafts(persisted);
	}, [persisted, setDrafts]);

	return null;
}

function StatusRow({ status }: { readonly status: ChannelStatusEvent | undefined }): ReactElement | null {
	const { t } = useTranslation();
	if (!status) return null;
	return (
		<Field orientation="horizontal">
			<span
				className={`inline-block h-2 w-2 rounded-full ${STATUS_COLORS[status.status]}`}
				aria-hidden="true"
			/>
			<FieldLabel className="font-normal text-muted-foreground">
				{t(`channels.status.${status.status}`, status.status)}
			</FieldLabel>
		</Field>
	);
}

function TelegramSection(): ReactElement {
	const { t } = useTranslation();
	const { drafts, persisted, statuses, saving, restarting, patchDraft, handleSave, handleRestart } =
		useChannelsContext();

	const draft = drafts.telegram;
	const persistedDraft = persisted.telegram;
	const status = statuses.telegram;
	const isSaving = saving.has('telegram');
	const isRestarting = restarting.has('telegram');
	const isDirty =
		draft.token !== persistedDraft.token || draft.allowFrom !== persistedDraft.allowFrom;

	return (
		<form
			className="flex w-full max-w-2xl flex-col gap-6"
			onSubmit={(e) => {
				e.preventDefault();
				void handleSave('telegram');
			}}
		>
			<div className="flex flex-col gap-1">
				<H3>{t('channels.telegram', 'Telegram')}</H3>
				<Muted>
					{t(
						'channels.telegramDescription',
						'Connect a Telegram bot using a token from @BotFather.'
					)}
				</Muted>
			</div>
			<FieldGroup>
				<StatusRow status={status} />
				<div className="grid grid-cols-1 gap-4 @md/field-group:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="channel-telegram-token" className="flex items-center gap-1.5">
							{t('settings.channels.token', 'Token')}
							<InfoHint
								text={t(
									'settings.channels.tokenTooltip',
									'Bot token from @BotFather. Stored encrypted in your OS keychain.'
								)}
							/>
						</FieldLabel>
						<Input
							id="channel-telegram-token"
							type="password"
							value={draft.token}
							onChange={(e) => patchDraft('telegram', { token: e.target.value })}
							placeholder="123456:ABC-DEF…"
							autoComplete="off"
							spellCheck={false}
							disabled={isSaving}
							required
						/>
						<FieldDescription>
							{t('settings.channels.tokenDescription', 'Stored encrypted in your OS keychain.')}
						</FieldDescription>
					</Field>
					<Field>
						<FieldLabel htmlFor="channel-telegram-allow" className="flex items-center gap-1.5">
							{t('settings.channels.allowFrom', 'Allowed senders')}
							<InfoHint
								text={t(
									'settings.channels.allowFromTooltip',
									'Comma-separated Telegram usernames or IDs allowed to message the bot. Empty allows all.'
								)}
							/>
						</FieldLabel>
						<Input
							id="channel-telegram-allow"
							type="text"
							value={draft.allowFrom}
							onChange={(e) => patchDraft('telegram', { allowFrom: e.target.value })}
							placeholder="e.g. @user1, @user2"
							autoComplete="off"
							spellCheck={false}
							disabled={isSaving}
						/>
						<FieldDescription>
							{t(
								'settings.channels.allowFromDescription',
								'Comma-separated list. Leave empty to allow all.'
							)}
						</FieldDescription>
					</Field>
				</div>
				{status?.status === 'error' && status.error && <FieldError>{status.error}</FieldError>}
			</FieldGroup>
			<div className="flex items-center justify-end gap-2">
				<Button
					variant="outline"
					type="button"
					disabled={isRestarting}
					onClick={() => void handleRestart('telegram')}
				>
					{isRestarting ? <Spinner /> : <RefreshCw />}
					{t('settings.channels.reconnect', 'Reconnect')}
				</Button>
				<Button type="submit" disabled={!isDirty || isSaving}>
					{isSaving ? <Spinner /> : <Save />}
					{t('common.save', 'Save')}
				</Button>
			</div>
		</form>
	);
}

function sanitizePhone(raw: string): string {
	return raw.replace(/[^\d]/g, '');
}

function WhatsappSection(): ReactElement {
	const { t } = useTranslation();
	const { drafts, persisted, statuses, saving, patchDraft, handleSave } = useChannelsContext();

	const draft = drafts.whatsapp;
	const persistedDraft = persisted.whatsapp;
	const status = statuses.whatsapp;
	const isSaving = saving.has('whatsapp');
	const isDirty =
		draft.phoneNumber !== persistedDraft.phoneNumber || draft.token !== persistedDraft.token;

	const [requesting, setRequesting] = useState(false);
	const [requestError, setRequestError] = useState<string | null>(null);

	const canRequest = sanitizePhone(draft.phoneNumber).length > 0 && !requesting && !isSaving;
	const hasCode = draft.token.length > 0;

	const handleRequest = async (): Promise<void> => {
		setRequestError(null);
		setRequesting(true);
		try {
			const code = await window.app.requestWhatsappPairingCode(
				sanitizePhone(draft.phoneNumber)
			);
			patchDraft('whatsapp', { token: code });
		} catch (err) {
			setRequestError(err instanceof Error ? err.message : String(err));
		} finally {
			setRequesting(false);
		}
	};

	return (
		<form
			className="flex w-full max-w-lg flex-col gap-6"
			onSubmit={(e) => {
				e.preventDefault();
				void handleSave('whatsapp');
			}}
		>
			<div className="flex flex-col gap-1">
				<H3>{t('channels.whatsapp', 'WhatsApp')}</H3>
				<Muted>
					{t(
						'channels.whatsappDescription',
						'Pair a WhatsApp account with an 8-character code shown on this screen.'
					)}
				</Muted>
			</div>
			<FieldGroup>
				<StatusRow status={status} />
				<Field>
					<FieldLabel htmlFor="channel-whatsapp-phone">
						{t('settings.channels.phoneNumber', 'Phone number')}
					</FieldLabel>
					<Input
						id="channel-whatsapp-phone"
						type="tel"
						inputMode="tel"
						value={draft.phoneNumber}
						onChange={(e) => patchDraft('whatsapp', { phoneNumber: e.target.value })}
						placeholder="e.g. 393331234567"
						autoComplete="off"
						spellCheck={false}
						disabled={isSaving || requesting}
						required
					/>
					<FieldDescription>
						{t(
							'settings.channels.phoneNumberDescription',
							'Digits only, including country code (no +, no spaces).'
						)}
					</FieldDescription>
				</Field>
				<div>
					<Button
						type="button"
						variant="outline"
						disabled={!canRequest}
						onClick={() => void handleRequest()}
					>
						{requesting ? <Spinner /> : <KeyRound />}
						{t('settings.channels.requestPairingCode', 'Request pairing code')}
					</Button>
				</div>
				{(hasCode || requesting) && (
					<Field>
						<FieldLabel htmlFor="channel-whatsapp-token">
							{t('settings.channels.pairingCode', 'Pairing code')}
						</FieldLabel>
						<Input
							id="channel-whatsapp-token"
							type="text"
							value={draft.token}
							onChange={(e) =>
								patchDraft('whatsapp', { token: e.target.value.toUpperCase() })
							}
							placeholder="XXXX-XXXX"
							autoComplete="off"
							spellCheck={false}
							disabled={isSaving || requesting}
							className="font-mono tracking-[0.4em]"
						/>
						<FieldDescription>
							{t(
								'settings.channels.pairingCodeDescription',
								'Open WhatsApp → Linked devices → Link with phone number, then enter this code.'
							)}
						</FieldDescription>
					</Field>
				)}
				{requestError && <FieldError>{requestError}</FieldError>}
				{status?.status === 'error' && status.error && <FieldError>{status.error}</FieldError>}
			</FieldGroup>
			<div className="flex items-center justify-end gap-2">
				<Button type="submit" disabled={!isDirty || isSaving}>
					{isSaving ? <Spinner /> : <Save />}
					{t('common.save', 'Save')}
				</Button>
			</div>
		</form>
	);
}

function DiscordSection(): ReactElement {
	const { t } = useTranslation();
	const { drafts, persisted, statuses, saving, restarting, patchDraft, handleSave, handleRestart } =
		useChannelsContext();

	const draft = drafts.discord;
	const persistedDraft = persisted.discord;
	const status = statuses.discord;
	const isSaving = saving.has('discord');
	const isRestarting = restarting.has('discord');
	const isDirty =
		draft.token !== persistedDraft.token || draft.allowFrom !== persistedDraft.allowFrom;

	return (
		<form
			className="flex w-full max-w-lg flex-col gap-6"
			onSubmit={(e) => {
				e.preventDefault();
				void handleSave('discord');
			}}
		>
			<div className="flex flex-col gap-1">
				<H3>{t('channels.discord', 'Discord')}</H3>
				<Muted>
					{t('channels.discordDescription', 'Connect a Discord bot using its bot token.')}
				</Muted>
			</div>
			<FieldGroup>
				<StatusRow status={status} />
				<Field>
					<FieldLabel htmlFor="channel-discord-token">
						{t('settings.channels.token', 'Token')}
					</FieldLabel>
					<Input
						id="channel-discord-token"
						type="password"
						value={draft.token}
						onChange={(e) => patchDraft('discord', { token: e.target.value })}
						placeholder="MTk4NjIy…"
						autoComplete="off"
						spellCheck={false}
						disabled={isSaving}
						required
					/>
					<FieldDescription>
						{t('settings.channels.tokenDescription', 'Stored encrypted in your OS keychain.')}
					</FieldDescription>
				</Field>
				<Field>
					<FieldLabel htmlFor="channel-discord-allow">
						{t('settings.channels.allowFrom', 'Allowed senders')}
					</FieldLabel>
					<Input
						id="channel-discord-allow"
						type="text"
						value={draft.allowFrom}
						onChange={(e) => patchDraft('discord', { allowFrom: e.target.value })}
						placeholder="e.g. user1, user2"
						autoComplete="off"
						spellCheck={false}
						disabled={isSaving}
					/>
					<FieldDescription>
						{t(
							'settings.channels.allowFromDescription',
							'Comma-separated list. Leave empty to allow all.'
						)}
					</FieldDescription>
				</Field>
				{status?.status === 'error' && status.error && <FieldError>{status.error}</FieldError>}
			</FieldGroup>
			<div className="flex items-center justify-end gap-2">
				<Button
					variant="outline"
					type="button"
					disabled={isRestarting}
					onClick={() => void handleRestart('discord')}
				>
					{isRestarting ? <Spinner /> : <RefreshCw />}
					{t('settings.channels.reconnect', 'Reconnect')}
				</Button>
				<Button type="submit" disabled={!isDirty || isSaving}>
					{isSaving ? <Spinner /> : <Save />}
					{t('common.save', 'Save')}
				</Button>
			</div>
		</form>
	);
}

export default function Page(): ReactElement {
	const { t } = useTranslation();

	return (
		<ChannelsProvider>
			<Bootstrap />
			<div className="w-full max-w-2xl">
				<h1 className="text-2xl font-semibold mb-6">{t('settings.tabs.channels', 'Channels')}</h1>
				<div className="flex flex-col gap-10">
					<TelegramSection />
					<Separator />
					<WhatsappSection />
					<Separator />
					<DiscordSection />
				</div>
			</div>
		</ChannelsProvider>
	);
}
