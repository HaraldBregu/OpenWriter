import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, RefreshCw } from 'lucide-react';
import type { ChannelStatusEvent, ChannelType } from '../../../../../shared/types';
import { Button } from '@/components/ui/Button';
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/Card';
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useChannelsContext } from '../Provider';

interface ChannelMeta {
	readonly title: string;
	readonly description: string;
	readonly tokenPlaceholder: string;
	readonly allowFromPlaceholder: string;
}

const CHANNEL_META: Record<ChannelType, ChannelMeta> = {
	telegram: {
		title: 'Telegram',
		description: 'Connect a Telegram bot using a token from @BotFather.',
		tokenPlaceholder: '123456:ABC-DEF…',
		allowFromPlaceholder: 'e.g. @user1, @user2',
	},
	whatsapp: {
		title: 'WhatsApp',
		description: 'Pair a WhatsApp account by scanning a QR code.',
		tokenPlaceholder: '',
		allowFromPlaceholder: 'e.g. 1234567890@s.whatsapp.net',
	},
	discord: {
		title: 'Discord',
		description: 'Connect a Discord bot using its bot token.',
		tokenPlaceholder: 'MTk4NjIy…',
		allowFromPlaceholder: 'e.g. user1, user2',
	},
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

interface ChannelFormProps {
	readonly channelType: ChannelType;
}

export function ChannelForm({ channelType }: ChannelFormProps): ReactElement {
	const { t } = useTranslation();
	const {
		drafts,
		persisted,
		statuses,
		saving,
		restarting,
		patchDraft,
		handleSave,
		handleRestart,
	} = useChannelsContext();

	const meta = CHANNEL_META[channelType];
	const draft = drafts[channelType];
	const persistedForType = persisted[channelType];
	const status = statuses[channelType];
	const isSaving = saving.has(channelType);
	const isRestarting = restarting.has(channelType);
	const isDirty =
		draft.token !== persistedForType.token || draft.allowFrom !== persistedForType.allowFrom;
	const isWhatsapp = channelType === 'whatsapp';

	return (
		<Card>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					void handleSave(channelType);
				}}
			>
				<CardHeader className="border-b">
					<CardTitle>{meta.title}</CardTitle>
					<CardDescription>{meta.description}</CardDescription>
					{status && (
						<CardAction>
							<span className="flex items-center gap-2 text-xs text-muted-foreground">
								<span
									className={`inline-block h-2 w-2 rounded-full ${STATUS_COLORS[status.status]}`}
									aria-hidden="true"
								/>
								{STATUS_LABELS[status.status]}
							</span>
						</CardAction>
					)}
				</CardHeader>

				<CardContent>
					<FieldGroup>
						{!isWhatsapp && (
							<Field>
								<FieldLabel htmlFor={`channel-${channelType}-token`}>
									{t('settings.channels.token', 'Token')}
								</FieldLabel>
								<Input
									id={`channel-${channelType}-token`}
									type="password"
									value={draft.token}
									onChange={(e) => patchDraft(channelType, { token: e.target.value })}
									placeholder={meta.tokenPlaceholder}
									autoComplete="off"
									spellCheck={false}
									disabled={isSaving}
								/>
								<FieldDescription>
									{t(
										'settings.channels.tokenDescription',
										'Stored encrypted in your OS keychain.'
									)}
								</FieldDescription>
							</Field>
						)}

						<Field>
							<FieldLabel htmlFor={`channel-${channelType}-allow`}>
								{t('settings.channels.allowFrom', 'Allowed senders')}
							</FieldLabel>
							<Input
								id={`channel-${channelType}-allow`}
								type="text"
								value={draft.allowFrom}
								onChange={(e) => patchDraft(channelType, { allowFrom: e.target.value })}
								placeholder={meta.allowFromPlaceholder}
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

						{isWhatsapp && status?.status === 'qr' && status.qrDataUrl && (
							<Field>
								<FieldLabel>
									{t(
										'settings.channels.scanQr',
										'Open WhatsApp → Linked devices → Link a device, then scan:'
									)}
								</FieldLabel>
								<div className="flex justify-center">
									<img
										src={status.qrDataUrl}
										alt="WhatsApp pairing QR"
										className="h-48 w-48 rounded-md border border-border bg-white p-2"
									/>
								</div>
							</Field>
						)}

						{status?.status === 'error' && status.error && (
							<FieldError>{status.error}</FieldError>
						)}
					</FieldGroup>
				</CardContent>

				<CardFooter className="justify-end gap-2">
					{isWhatsapp && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={isRestarting}
							onClick={() => void handleRestart('whatsapp')}
						>
							{isRestarting ? <Spinner /> : <RefreshCw />}
							{status?.status === 'connected'
								? t('settings.channels.reconnect', 'Reconnect')
								: t('settings.channels.pair', 'Pair / Connect')}
						</Button>
					)}
					<Button type="submit" size="sm" disabled={!isDirty || isSaving}>
						{isSaving ? <Spinner /> : <Save />}
						{t('common.save', 'Save')}
					</Button>
				</CardFooter>
			</form>
		</Card>
	);
}
