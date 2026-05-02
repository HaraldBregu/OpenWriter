import React from 'react';
import { useTranslation } from 'react-i18next';
import { UserCircle } from 'lucide-react';
import { SectionHeader, SettingRow } from '../components';
import { Button } from '@/components/ui/Button';

const AccountPage: React.FC = () => {
	const { t } = useTranslation();

	return (
		<div className="w-full max-w-2xl">
			<h1 className="text-lg font-normal mb-6">{t('settings.tabs.account')}</h1>

			<SectionHeader title={t('settings.account.section')} />

			<div className="flex items-start gap-4 py-4 border-b">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-input bg-background">
					<UserCircle className="h-5 w-5 text-muted-foreground" />
				</div>
				<div className="flex flex-1 flex-col">
					<span className="text-sm">{t('settings.account.guest')}</span>
					<span className="text-xs text-muted-foreground">
						{t('settings.account.notSignedIn')}
					</span>
				</div>
			</div>

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
