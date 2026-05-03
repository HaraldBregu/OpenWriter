import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import type {
	Channel,
	ChannelType,
	TelegramChannelProperties,
	WhatsappChannelProperties,
} from '../../../../../shared/types';
import { Button } from '@/components/ui/Button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import {
	PageBody,
	PageContainer,
	PageHeader,
	PageHeaderDescription,
	PageHeaderTitle,
} from '@/components/app/base/page';

interface DraftProperties {
	token: string;
	allowFrom: string;
}

const EMPTY_DRAFT: DraftProperties = { token: '', allowFrom: '' };

const CHANNEL_TYPES: readonly ChannelType[] = ['telegram', 'whatsapp'] as const;

const CHANNEL_LABELS: Record<ChannelType, string> = {
	telegram: 'Telegram',
	whatsapp: 'WhatsApp',
};

function toDraft(props: TelegramChannelProperties | WhatsappChannelProperties): DraftProperties {
	return { token: props.token, allowFrom: props.allowFrom.join(', ') };
}

function parseAllowFrom(raw: string): string[] {
	return raw
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

const ChannelsPage: React.FC = () => {
	const { t } = useTranslation();
	const [channel, setChannel] = useState<Channel | null>(null);
	const [drafts, setDrafts] = useState<Record<ChannelType, DraftProperties>>({
		telegram: EMPTY_DRAFT,
		whatsapp: EMPTY_DRAFT,
	});
	const [saving, setSaving] = useState<ReadonlySet<ChannelType>>(() => new Set());

	const persisted = useMemo<Record<ChannelType, DraftProperties>>(
		() => ({
			telegram: channel ? toDraft(channel.telegram) : EMPTY_DRAFT,
			whatsapp: channel ? toDraft(channel.whatsapp) : EMPTY_DRAFT,
		}),
		[channel]
	);

	const load = useCallback(async () => {
		const c = await window.app.getChannel();
		setChannel(c);
		return c;
	}, []);

	useEffect(() => {
		load().catch(() => setChannel(null));
	}, [load]);

	useEffect(() => {
		setDrafts(persisted);
	}, [persisted]);

	const handleSave = useCallback(
		async (type: ChannelType) => {
			const draft = drafts[type];
			const persistedForType = persisted[type];
			if (
				draft.token === persistedForType.token &&
				draft.allowFrom === persistedForType.allowFrom
			) {
				return;
			}

			setSaving((prev) => new Set(prev).add(type));
			try {
				const properties = {
					token: draft.token.trim(),
					allowFrom: parseAllowFrom(draft.allowFrom),
				};
				const next =
					type === 'telegram'
						? await window.app.setChannelProperties('telegram', properties)
						: await window.app.setChannelProperties('whatsapp', properties);
				setChannel(next);
			} finally {
				setSaving((prev) => {
					const next = new Set(prev);
					next.delete(type);
					return next;
				});
			}
		},
		[drafts, persisted]
	);

	return (
		<PageContainer>
			<PageHeader className="px-0 border-none">
				<PageHeaderTitle>{t('settings.channels.title', 'Channels')}</PageHeaderTitle>
				<PageHeaderDescription>
					{t(
						'settings.channels.subtitle',
						'Configure messaging channels (Telegram, WhatsApp).'
					)}
				</PageHeaderDescription>
			</PageHeader>
			<PageBody className="px-0">
				<FieldGroup className="max-w-2xl">
					{CHANNEL_TYPES.map((type) => {
						const isSaving = saving.has(type);
						const draft = drafts[type] ?? EMPTY_DRAFT;
						const persistedForType = persisted[type];
						const isDirty =
							draft.token !== persistedForType.token ||
							draft.allowFrom !== persistedForType.allowFrom;

						return (
							<form
								key={type}
								onSubmit={(e) => {
									e.preventDefault();
									void handleSave(type);
								}}
								className="border-b py-4"
							>
								<FieldLabel className="mb-2 block text-sm font-medium">
									{CHANNEL_LABELS[type]}
								</FieldLabel>
								<Field>
									<FieldLabel htmlFor={`channel-${type}-token`}>
										{t('settings.channels.token', 'Token')}
									</FieldLabel>
									<Input
										id={`channel-${type}-token`}
										type="password"
										value={draft.token}
										onChange={(e) =>
											setDrafts((prev) => ({
												...prev,
												[type]: { ...prev[type], token: e.target.value },
											}))
										}
										placeholder={t('settings.channels.tokenPlaceholder', 'Enter token…')}
										autoComplete="off"
										spellCheck={false}
										disabled={isSaving}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor={`channel-${type}-allow`}>
										{t('settings.channels.allowFrom', 'Allowed senders (comma-separated)')}
									</FieldLabel>
									<Field orientation="horizontal">
										<Input
											id={`channel-${type}-allow`}
											type="text"
											value={draft.allowFrom}
											onChange={(e) =>
												setDrafts((prev) => ({
													...prev,
													[type]: { ...prev[type], allowFrom: e.target.value },
												}))
											}
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
							</form>
						);
					})}
				</FieldGroup>
			</PageBody>
		</PageContainer>
	);
};

export default ChannelsPage;
