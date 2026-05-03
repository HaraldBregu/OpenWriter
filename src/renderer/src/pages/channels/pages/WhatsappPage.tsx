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

export default function WhatsappPage(): ReactElement {
	const { t } = useTranslation();
	const { drafts, persisted, statuses, saving, restarting, patchDraft, handleSave, handleRestart } =
		useChannelsContext();

	const draft = drafts.whatsapp;
	const persistedDraft = persisted.whatsapp;
	const status = statuses.whatsapp;
	const isSaving = saving.has('whatsapp');
	const isRestarting = restarting.has('whatsapp');
	const isDirty = draft.allowFrom !== persistedDraft.allowFrom;

	return (
		<Card>
			<CardHeader>
				<CardTitle>WhatsApp</CardTitle>
				<CardDescription>Pair a WhatsApp account by scanning a QR code.</CardDescription>
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
					id="whatsapp-form"
					onSubmit={(e) => {
						e.preventDefault();
						void handleSave('whatsapp');
					}}
				>
					<div className="flex flex-col gap-6">
						<div className="grid gap-2">
							<div className="flex items-center">
								<Label htmlFor="channel-whatsapp-allow">
									{t('settings.channels.allowFrom', 'Allowed senders')}
								</Label>
								<span className="ml-auto text-sm text-muted-foreground">
									{t('settings.channels.optional', 'Optional')}
								</span>
							</div>
							<Input
								id="channel-whatsapp-allow"
								type="text"
								value={draft.allowFrom}
								onChange={(e) => patchDraft('whatsapp', { allowFrom: e.target.value })}
								placeholder="e.g. 1234567890@s.whatsapp.net"
								autoComplete="off"
								spellCheck={false}
								disabled={isSaving}
							/>
						</div>
						{status?.status === 'qr' && status.qrDataUrl && (
							<div className="grid gap-2">
								<Label>
									{t(
										'settings.channels.scanQr',
										'Open WhatsApp → Linked devices → Link a device, then scan:'
									)}
								</Label>
								<div className="flex justify-center">
									<img
										src={status.qrDataUrl}
										alt="WhatsApp pairing QR"
										className="h-48 w-48 rounded-md border border-border bg-white p-2"
									/>
								</div>
							</div>
						)}
						{status?.status === 'error' && status.error && (
							<p className="text-sm text-destructive">{status.error}</p>
						)}
					</div>
				</form>
			</CardContent>
			<CardFooter className="flex-col gap-2">
				<Button
					type="submit"
					form="whatsapp-form"
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
					onClick={() => void handleRestart('whatsapp')}
				>
					{isRestarting ? <Spinner /> : <RefreshCw />}
					{status?.status === 'connected'
						? t('settings.channels.reconnect', 'Reconnect')
						: t('settings.channels.pair', 'Pair / Connect')}
				</Button>
			</CardFooter>
		</Card>
	);
}
