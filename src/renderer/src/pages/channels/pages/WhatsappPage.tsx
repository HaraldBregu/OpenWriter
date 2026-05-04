import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, KeyRound } from 'lucide-react';
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

function sanitizePhone(raw: string): string {
	return raw.replace(/[^\d]/g, '');
}

export default function WhatsappPage(): ReactElement {
	const { t } = useTranslation();
	const { drafts, persisted, statuses, saving, patchDraft, handleSave } = useChannelsContext();

	const draft = drafts.whatsapp;
	const persistedDraft = persisted.whatsapp;
	const status = statuses.whatsapp;
	const isSaving = saving.has('whatsapp');
	const isDirty =
		draft.phoneNumber !== persistedDraft.phoneNumber || draft.token !== persistedDraft.token;

	const [requesting, setRequesting] = useState(false);
	const [requestError, setRequestError] = useState<string | null>(null);

	const canRequest = sanitizePhone(draft.phoneNumber).length > 0 && !requesting && !isSaving;
	const hasCode = draft.token.length > 0;

	const handleRequest = async (): Promise<void> => {
		setRequestError(null);
		setRequesting(true);
		try {
			const code = await window.app.requestWhatsappPairingCode(
				sanitizePhone(draft.phoneNumber)
			);
			patchDraft('whatsapp', { token: code });
		} catch (err) {
			setRequestError(err instanceof Error ? err.message : String(err));
		} finally {
			setRequesting(false);
		}
	};

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
						disabled={isSaving || requesting}
						required
					/>
					<FieldDescription>
						{t(
							'settings.channels.phoneNumberDescription',
							'Digits only, including country code (no +, no spaces).'
						)}
					</FieldDescription>
				</Field>
				<div>
					<Button
						type="button"
						variant="outline"
						disabled={!canRequest}
						onClick={() => void handleRequest()}
					>
						{requesting ? <Spinner /> : <KeyRound />}
						{t('settings.channels.requestPairingCode', 'Request pairing code')}
					</Button>
				</div>
				{(hasCode || requesting) && (
					<Field>
						<FieldLabel htmlFor="channel-whatsapp-token">
							{t('settings.channels.pairingCode', 'Pairing code')}
						</FieldLabel>
						<Input
							id="channel-whatsapp-token"
							type="text"
							value={draft.token}
							onChange={(e) =>
								patchDraft('whatsapp', { token: e.target.value.toUpperCase() })
							}
							placeholder="XXXX-XXXX"
							autoComplete="off"
							spellCheck={false}
							disabled={isSaving || requesting}
							className="font-mono tracking-[0.4em]"
						/>
						<FieldDescription>
							{t(
								'settings.channels.pairingCodeDescription',
								'Open WhatsApp → Linked devices → Link with phone number, then enter this code.'
							)}
						</FieldDescription>
					</Field>
				)}
				{requestError && <FieldError>{requestError}</FieldError>}
				{status?.status === 'error' && status.error && (
					<FieldError>{status.error}</FieldError>
				)}
			</FieldGroup>
			<div className="flex items-center justify-end gap-2">
				<Button type="submit" disabled={!isDirty || isSaving}>
					{isSaving ? <Spinner /> : <Save />}
					{t('common.save', 'Save')}
				</Button>
			</div>
		</form>
	);
}
