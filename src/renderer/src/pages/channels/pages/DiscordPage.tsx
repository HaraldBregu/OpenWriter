import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
	Card,
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
			className="w-full max-w-lg"
			onSubmit={(e) => {
				e.preventDefault();
				void handleSave('discord');
			}}
		>
			<Card>
				<CardHeader>
					<CardTitle>Discord</CardTitle>
					<CardDescription>Connect a Discord bot using its bot token.</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldGroup>
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
						{status?.status === 'error' && status.error && (
							<FieldError>{status.error}</FieldError>
						)}
					</FieldGroup>
				</CardContent>
				<CardFooter className="justify-end gap-2">
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
				</CardFooter>
			</Card>
		</form>
	);
}
