import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSeparator,
	FieldSet,
} from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import type { ChannelStatusEvent } from '../../../../../shared/types';
import { useChannelsContext } from '../Provider';

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

export default function TelegramPage(): ReactElement {
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
			onSubmit={(e) => {
				e.preventDefault();
				void handleSave('telegram');
			}}
		>
			<FieldGroup className="w-full max-w-md">
				<FieldSet>
					<FieldLegend>Telegram</FieldLegend>
					<FieldDescription>
						Connect a Telegram bot using a token from @BotFather.
					</FieldDescription>
					{status && (
						<Field orientation="horizontal">
							<span
								className={`inline-block h-2 w-2 rounded-full ${STATUS_COLORS[status.status]}`}
								aria-hidden="true"
							/>
							<FieldLabel className="font-normal text-muted-foreground">
								{STATUS_LABELS[status.status]}
							</FieldLabel>
						</Field>
					)}
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="channel-telegram-token">
								{t('settings.channels.token', 'Token')}
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
								{t(
									'settings.channels.tokenDescription',
									'Stored encrypted in your OS keychain.'
								)}
							</FieldDescription>
						</Field>
						<Field>
							<FieldLabel htmlFor="channel-telegram-allow">
								{t('settings.channels.allowFrom', 'Allowed senders')}
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
					</FieldGroup>
				</FieldSet>
				{status?.status === 'error' && status.error && (
					<>
						<FieldSeparator />
						<FieldError>{status.error}</FieldError>
					</>
				)}
				<Field orientation="horizontal">
					<Button type="submit" disabled={!isDirty || isSaving}>
						{isSaving ? <Spinner /> : <Save />}
						{t('common.save', 'Save')}
					</Button>
					<Button
						variant="outline"
						type="button"
						disabled={isRestarting}
						onClick={() => void handleRestart('telegram')}
					>
						{isRestarting ? <Spinner /> : <RefreshCw />}
						{t('settings.channels.reconnect', 'Reconnect')}
					</Button>
				</Field>
			</FieldGroup>
		</form>
	);
}
