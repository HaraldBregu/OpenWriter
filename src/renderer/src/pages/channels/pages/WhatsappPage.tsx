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
	pairing_code: 'bg-blue-500',
	connected: 'bg-green-500',
	disconnected: 'bg-gray-400',
	error: 'bg-red-500',
};

function formatPairingCode(raw: string): string {
	const compact = raw.replace(/\s+/g, '').toUpperCase();
	if (compact.length === 8) return `${compact.slice(0, 4)}-${compact.slice(4)}`;
	return compact;
}

export default function WhatsappPage(): ReactElement {
	const { t } = useTranslation();
	const { drafts, persisted, statuses, saving, restarting, patchDraft, handleSave, handleRestart } =
		useChannelsContext();

	const draft = drafts.whatsapp;
	const persistedDraft = persisted.whatsapp;
	const status = statuses.whatsapp;
	const isSaving = saving.has('whatsapp');
	const isRestarting = restarting.has('whatsapp');
	const isDirty = draft.phoneNumber !== persistedDraft.phoneNumber;

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
						'Pair a WhatsApp account with an 8-character code shown on this screen.'
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
					<FieldLabel htmlFor="channel-whatsapp-phone">
						{t('settings.channels.phoneNumber', 'Phone number')}
					</FieldLabel>
					<Input
						id="channel-whatsapp-phone"
						type="tel"
						inputMode="tel"
						value={draft.phoneNumber}
						onChange={(e) => patchDraft('whatsapp', { phoneNumber: e.target.value })}
						placeholder="e.g. 393331234567"
						autoComplete="off"
						spellCheck={false}
						disabled={isSaving}
						required
					/>
					<FieldDescription>
						{t(
							'settings.channels.phoneNumberDescription',
							'Digits only, including country code (no +, no spaces).'
						)}
					</FieldDescription>
				</Field>
				{status?.status === 'pairing_code' && status.pairingCode && (
					<Field>
						<FieldLabel>
							{t(
								'settings.channels.enterPairingCode',
								'Open WhatsApp → Linked devices → Link with phone number, then enter:'
							)}
						</FieldLabel>
						<div className="flex justify-center">
							<code className="rounded-md border border-border bg-muted px-4 py-3 font-mono text-2xl tracking-[0.4em] select-all">
								{formatPairingCode(status.pairingCode)}
							</code>
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
					disabled={isRestarting || !persistedDraft.phoneNumber}
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
