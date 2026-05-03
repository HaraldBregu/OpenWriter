import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
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
	const { drafts, persisted, statuses, saving, patchDraft, handleSave } = useChannelsContext();

	const draft = drafts.telegram;
	const persistedDraft = persisted.telegram;
	const status = statuses.telegram;
	const isSaving = saving.has('telegram');
	const isDirty =
		draft.token !== persistedDraft.token || draft.allowFrom !== persistedDraft.allowFrom;

	return (
		<div className="w-full max-w-2xl">
			<Card>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						void handleSave('telegram');
					}}
				>
					<CardHeader className="border-b">
						<CardTitle>Telegram</CardTitle>
						<CardDescription>
							Connect a Telegram bot using a token from @BotFather.
						</CardDescription>
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

							{status?.status === 'error' && status.error && (
								<FieldError>{status.error}</FieldError>
							)}
						</FieldGroup>
					</CardContent>

					<CardFooter className="justify-end gap-2">
						<Button type="submit" size="sm" disabled={!isDirty || isSaving}>
							{isSaving ? <Spinner /> : <Save />}
							{t('common.save', 'Save')}
						</Button>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
