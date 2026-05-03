import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, RefreshCw } from 'lucide-react';
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
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
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
		<Card>
			<CardHeader>
				<CardTitle>Discord</CardTitle>
				<CardDescription>Connect a Discord bot using its bot token.</CardDescription>
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
				<form
					id="discord-form"
					onSubmit={(e) => {
						e.preventDefault();
						void handleSave('discord');
					}}
				>
					<div className="flex flex-col gap-6">
						<div className="grid gap-2">
							<Label htmlFor="channel-discord-token">
								{t('settings.channels.token', 'Token')}
							</Label>
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
						</div>
						<div className="grid gap-2">
							<div className="flex items-center">
								<Label htmlFor="channel-discord-allow">
									{t('settings.channels.allowFrom', 'Allowed senders')}
								</Label>
								<span className="ml-auto text-sm text-muted-foreground">
									{t('settings.channels.optional', 'Optional')}
								</span>
							</div>
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
						</div>
						{status?.status === 'error' && status.error && (
							<p className="text-sm text-destructive">{status.error}</p>
						)}
					</div>
				</form>
			</CardContent>
			<CardFooter className="flex-col gap-2">
				<Button
					type="submit"
					form="discord-form"
					className="w-full"
					disabled={!isDirty || isSaving}
				>
					{isSaving ? <Spinner /> : <Save />}
					{t('common.save', 'Save')}
				</Button>
				<Button
					type="button"
					variant="outline"
					className="w-full"
					disabled={isRestarting}
					onClick={() => void handleRestart('discord')}
				>
					{isRestarting ? <Spinner /> : <RefreshCw />}
					{t('settings.channels.reconnect', 'Reconnect')}
				</Button>
			</CardFooter>
		</Card>
	);
}
