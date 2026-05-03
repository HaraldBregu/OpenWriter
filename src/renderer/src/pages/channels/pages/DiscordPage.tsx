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

export default function DiscordPage(): ReactElement {
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
			onSubmit={(e) => {
				e.preventDefault();
				void handleSave('discord');
			}}
		>
			<FieldGroup className="w-full max-w-lg">
				<FieldSet>
					<FieldLegend>Discord</FieldLegend>
					<FieldDescription>Connect a Discord bot using its bot token.</FieldDescription>
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
								{t(
									'settings.channels.tokenDescription',
									'Stored encrypted in your OS keychain.'
								)}
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
						onClick={() => void handleRestart('discord')}
					>
						{isRestarting ? <Spinner /> : <RefreshCw />}
						{t('settings.channels.reconnect', 'Reconnect')}
					</Button>
				</Field>
			</FieldGroup>
		</form>
	);
}
