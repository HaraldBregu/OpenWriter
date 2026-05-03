import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, RefreshCw } from 'lucide-react';
import type { ChannelStatusEvent, ChannelType } from '../../../../../shared/types';
import { Button } from '@/components/ui/Button';
import { Field, FieldLabel } from '@/components/ui/Field';
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

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				void handleSave(channelType);
			}}
			className="border-b py-4"
		>
			<div className="mb-2 flex items-center justify-between">
				<FieldLabel className="block text-sm font-medium">{CHANNEL_LABELS[channelType]}</FieldLabel>
				{status && (
					<span className="flex items-center gap-2 text-xs text-muted-foreground">
						<span
							className={`inline-block h-2 w-2 rounded-full ${STATUS_COLORS[status.status]}`}
						/>
						{STATUS_LABELS[status.status]}
					</span>
				)}
			</div>

			{channelType === 'whatsapp' ? (
				<>
					<Field>
						<FieldLabel htmlFor={`channel-${channelType}-allow`}>
							{t('settings.channels.allowFrom', 'Allowed senders (comma-separated)')}
						</FieldLabel>
						<Field orientation="horizontal">
							<Input
								id={`channel-${channelType}-allow`}
								type="text"
								value={draft.allowFrom}
								onChange={(e) => patchDraft(channelType, { allowFrom: e.target.value })}
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
					<Field>
						<FieldLabel htmlFor={`channel-${channelType}-allow`}>
							{t('settings.channels.allowFrom', 'Allowed senders (comma-separated)')}
						</FieldLabel>
						<Field orientation="horizontal">
							<Input
								id={`channel-${channelType}-allow`}
								type="text"
								value={draft.allowFrom}
								onChange={(e) => patchDraft(channelType, { allowFrom: e.target.value })}
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
}
