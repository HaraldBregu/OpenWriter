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
} from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { H3, Muted } from '@/components/ui/Typography';
import type { ChannelStatusEvent } from '../../../../../shared/types';
import { useChannelsContext } from '../Provider';

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
						'Pair a WhatsApp account by scanning a QR code.'
					)}
				</Muted>
			</div>
			<FieldGroup>
				{status && (
					<Field orientation="horizontal">
						<span
							className={`inline-block h-2 w-2 rounded-full ${STATUS_COLORS[status.status]}`}
							aria-hidden="true"
						/>
						<FieldLabel className="font-normal text-muted-foreground">
							{t(`channels.status.${status.status}`, status.status)}
						</FieldLabel>
					</Field>
				)}
				<Field>
					<FieldLabel htmlFor="channel-whatsapp-allow">
						{t('settings.channels.allowFrom', 'Allowed senders')}
					</FieldLabel>
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
					<FieldDescription>
						{t(
							'settings.channels.allowFromDescription',
							'Comma-separated list. Leave empty to allow all.'
						)}
					</FieldDescription>
				</Field>
				{status?.status === 'qr' && status.qrDataUrl && (
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
			<div className="flex items-center justify-end gap-2">
				<Button
					variant="outline"
					type="button"
					disabled={isRestarting}
					onClick={() => void handleRestart('whatsapp')}
				>
					{isRestarting ? <Spinner /> : <RefreshCw />}
					{status?.status === 'connected'
						? t('settings.channels.reconnect', 'Reconnect')
						: t('settings.channels.pair', 'Pair / Connect')}
				</Button>
				<Button type="submit" disabled={!isDirty || isSaving}>
					{isSaving ? <Spinner /> : <Save />}
					{t('common.save', 'Save')}
				</Button>
			</div>
		</form>
	);
}
