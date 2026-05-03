import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, RefreshCw } from 'lucide-react';
import type { ChannelStatusEvent, ChannelType } from '../../../../../shared/types';
import { Button } from '@/components/ui/Button';
import {
	Card,
	CardAction,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/Card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useChannelsContext } from '../Provider';

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
				<CardHeader>
					<CardTitle>{CHANNEL_LABELS[channelType]}</CardTitle>
					{status && (
						<CardAction>
							<span className="flex items-center gap-2 text-xs text-muted-foreground">
								<span
									className={`inline-block h-2 w-2 rounded-full ${STATUS_COLORS[status.status]}`}
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
									placeholder={t('settings.channels.tokenPlaceholder', 'Enter token…')}
									autoComplete="off"
									spellCheck={false}
									disabled={isSaving}
								/>
							</Field>
						)}

						<Field>
							<FieldLabel htmlFor={`channel-${channelType}-allow`}>
								{t('settings.channels.allowFrom', 'Allowed senders (comma-separated)')}
							</FieldLabel>
							<Input
								id={`channel-${channelType}-allow`}
								type="text"
								value={draft.allowFrom}
								onChange={(e) => patchDraft(channelType, { allowFrom: e.target.value })}
								placeholder={
									isWhatsapp ? 'e.g. 1234567890@s.whatsapp.net' : 'e.g. user1, user2'
								}
								autoComplete="off"
								spellCheck={false}
								disabled={isSaving}
							/>
						</Field>

						{isWhatsapp && status?.status === 'qr' && status.qrDataUrl && (
							<Field>
								<FieldLabel>
									{t(
										'settings.channels.scanQr',
										'Open WhatsApp → Linked devices → Link a device, then scan:'
									)}
								</FieldLabel>
								<img
									src={status.qrDataUrl}
									alt="WhatsApp pairing QR"
									className="h-56 w-56 rounded border border-border bg-white p-2"
								/>
							</Field>
						)}

						{status?.status === 'error' && status.error && (
							<span className="text-xs text-red-500">{status.error}</span>
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
					)}
					<Button type="submit" size="sm" disabled={!isDirty || isSaving}>
						{isSaving ? <Spinner /> : <Save className="mr-1 h-3 w-3" />}
						{t('common.save', 'Save')}
					</Button>
				</CardFooter>
			</form>
		</Card>
	);
}
