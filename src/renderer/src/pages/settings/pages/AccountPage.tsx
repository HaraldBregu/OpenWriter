import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserCircle } from 'lucide-react';
import type { UserProfile } from '../../../../../shared/types';
import { SectionHeader, SettingRow } from '../components';
import { Button } from '@/components/ui/Button';
import { Large, Muted, Small } from '@/components/ui/Typography';

const AccountPage: React.FC = () => {
	const { t } = useTranslation();
	const [profile, setProfile] = useState<UserProfile | null>(null);

	useEffect(() => {
		let cancelled = false;
		window.app
			.getProfile()
			.then((p) => {
				if (!cancelled) setProfile(p);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);

	const fullName = profile
		? `${profile.firstName} ${profile.lastName}`.trim()
		: '';
	const displayName = fullName || t('settings.account.guest');
	const subtitle = profile
		? t('settings.account.signedIn')
		: t('settings.account.notSignedIn');

	return (
		<div className="w-full max-w-2xl">
			<Large className="mb-6 font-normal">{t('settings.tabs.account')}</Large>

			<SectionHeader title={t('settings.account.section')} />

			<div className="flex items-start gap-4 py-4 border-b">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-input bg-background">
					<UserCircle className="h-5 w-5 text-muted-foreground" />
				</div>
				<div className="flex flex-1 flex-col">
					<Small>{displayName}</Small>
					<Muted className="text-xs">{subtitle}</Muted>
				</div>
			</div>

			<SettingRow label={t('settings.account.firstName')}>
				<Small>{profile?.firstName || '—'}</Small>
			</SettingRow>

			<SettingRow label={t('settings.account.lastName')}>
				<Small>{profile?.lastName || '—'}</Small>
			</SettingRow>

			<SettingRow
				label={t('settings.account.signIn')}
				description={t('settings.account.signInDescription')}
			>
				<Button variant="outline" size="sm" disabled>
					{t('settings.account.signIn')}
				</Button>
			</SettingRow>
		</div>
	);
};

export default AccountPage;
