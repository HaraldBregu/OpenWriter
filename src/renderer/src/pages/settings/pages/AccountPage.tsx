import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserCircle } from 'lucide-react';
import type { UserProfile } from '../../../../../shared/types';
import { SectionHeader } from '../components';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
	ItemRow,
	ItemRowActions,
	ItemRowContent,
	ItemRowTitle,
	ItemRowDescription,
} from '@/components/ui/ItemRow';
import { Large, Muted, Small } from '@/components/ui/Typography';

type EditingField = 'firstName' | 'lastName' | null;

const EMPTY_PROFILE: UserProfile = { firstName: '', lastName: '' };

interface EditableNameProps {
	readonly value: string;
	readonly editing: boolean;
	readonly onStartEdit: () => void;
	readonly onCommit: (next: string) => void;
	readonly onCancel: () => void;
}

const EditableName: React.FC<EditableNameProps> = ({
	value,
	editing,
	onStartEdit,
	onCommit,
	onCancel,
}) => {
	const [draft, setDraft] = useState(value);

	useEffect(() => {
		if (editing) setDraft(value);
	}, [editing, value]);

	if (!editing) {
		return (
			<Small
				onDoubleClick={onStartEdit}
				className="cursor-text select-none"
			>
				{value || '—'}
			</Small>
		);
	}

	return (
		<Input
			autoFocus
			onFocus={(e) => e.currentTarget.select()}
			value={draft}
			onChange={(e) => setDraft(e.target.value)}
			onBlur={() => onCommit(draft)}
			onKeyDown={(e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					onCommit(draft);
				} else if (e.key === 'Escape') {
					e.preventDefault();
					onCancel();
				}
			}}
			className="h-7 w-48"
		/>
	);
};

const AccountPage: React.FC = () => {
	const { t } = useTranslation();
	const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
	const [hasProfile, setHasProfile] = useState(false);
	const [editing, setEditing] = useState<EditingField>(null);

	useEffect(() => {
		let cancelled = false;
		window.app
			.getProfile()
			.then((p) => {
				if (cancelled) return;
				if (p) {
					setProfile(p);
					setHasProfile(true);
				}
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);

	const persist = useCallback(
		(field: 'firstName' | 'lastName', raw: string) => {
			const trimmed = raw.trim();
			if (trimmed === profile[field]) {
				setEditing(null);
				return;
			}
			const next: UserProfile = { ...profile, [field]: trimmed };
			setProfile(next);
			setEditing(null);
			window.app
				.setProfile(next)
				.then((saved) => {
					setProfile(saved);
					setHasProfile(true);
				})
				.catch(() => {});
		},
		[profile]
	);

	const fullName = `${profile.firstName} ${profile.lastName}`.trim();
	const displayName = fullName || t('settings.account.guest');
	const subtitle = hasProfile
		? t('settings.account.signedIn')
		: t('settings.account.notSignedIn');

	return (
		<div className="w-full max-w-2xl">
			<Large className="mb-6 font-normal">{t('settings.tabs.account')}</Large>

			<SectionHeader title={t('settings.account.section')} />

			<div className="flex flex-col gap-2">
				<ItemRow variant="bottom-bordered" size="none">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-input bg-background">
						<UserCircle className="h-5 w-5 text-muted-foreground" />
					</div>
					<ItemRowContent>
						<ItemRowTitle>{displayName}</ItemRowTitle>
						<ItemRowDescription>
							<Muted className="text-xs">{subtitle}</Muted>
						</ItemRowDescription>
					</ItemRowContent>
				</ItemRow>

				<ItemRow variant="bottom-bordered" size="none">
					<ItemRowContent>
						<ItemRowTitle>{t('settings.account.firstName')}</ItemRowTitle>
						<ItemRowDescription>{t('settings.account.editHint')}</ItemRowDescription>
					</ItemRowContent>
					<ItemRowActions>
						<EditableName
							value={profile.firstName}
							editing={editing === 'firstName'}
							onStartEdit={() => setEditing('firstName')}
							onCommit={(v) => persist('firstName', v)}
							onCancel={() => setEditing(null)}
						/>
					</ItemRowActions>
				</ItemRow>

				<ItemRow variant="bottom-bordered" size="none">
					<ItemRowContent>
						<ItemRowTitle>{t('settings.account.lastName')}</ItemRowTitle>
						<ItemRowDescription>{t('settings.account.editHint')}</ItemRowDescription>
					</ItemRowContent>
					<ItemRowActions>
						<EditableName
							value={profile.lastName}
							editing={editing === 'lastName'}
							onStartEdit={() => setEditing('lastName')}
							onCommit={(v) => persist('lastName', v)}
							onCancel={() => setEditing(null)}
						/>
					</ItemRowActions>
				</ItemRow>

				<ItemRow variant="bottom-bordered" size="none">
					<ItemRowContent>
						<ItemRowTitle>{t('settings.account.signIn')}</ItemRowTitle>
						<ItemRowDescription>{t('settings.account.signInDescription')}</ItemRowDescription>
					</ItemRowContent>
					<ItemRowActions>
						<Button variant="outline" size="sm" disabled>
							{t('settings.account.signIn')}
						</Button>
					</ItemRowActions>
				</ItemRow>
			</div>
		</div>
	);
};

export default AccountPage;
