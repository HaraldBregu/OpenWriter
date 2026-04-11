import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';
import { SectionHeader, SettingRow } from '../components';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';

interface ProfileState {
	firstName: string;
	lastName: string;
}

const INITIAL_PROFILE: ProfileState = { firstName: '', lastName: '' };

const GeneralPage: React.FC = () => {
	const { t } = useTranslation();

	const [profile, setProfile] = useState<ProfileState>(INITIAL_PROFILE);
	const [savedProfile, setSavedProfile] = useState<ProfileState>(INITIAL_PROFILE);
	const [trayEnabled, setTrayEnabled] = useState(true);

	useEffect(() => {
		window.app.getTrayEnabled().then(setTrayEnabled);
	}, []);

	const hasProfileChanges = useMemo(
		() =>
			profile.firstName !== savedProfile.firstName || profile.lastName !== savedProfile.lastName,
		[profile, savedProfile]
	);

	const handleProfileChange = useCallback(
		(field: keyof ProfileState) => (e: React.ChangeEvent<HTMLInputElement>) => {
			setProfile((prev) => ({ ...prev, [field]: e.target.value }));
		},
		[]
	);

	const handleCancel = useCallback(() => {
		setProfile(savedProfile);
	}, [savedProfile]);

	const handleSave = useCallback(() => {
		setSavedProfile(profile);
	}, [profile]);

	const handleTrayToggle = useCallback((checked: boolean) => {
		setTrayEnabled(checked);
		window.app.setTrayEnabled(checked);
	}, []);

	const handleOpenAccessibility = useCallback(() => {
		window.app.openSystemAccessibility();
	}, []);

	const handleOpenScreenRecording = useCallback(() => {
		window.app.openSystemScreenRecording();
	}, []);

	const handleOpenAppDataFolder = useCallback(() => {
		window.app.openAppDataFolder();
	}, []);

	return (
		<div className="w-full max-w-2xl p-4 sm:p-6">
			<h1 className="text-lg font-normal mb-6">{t('settings.title')}</h1>

			{/* Profile Section */}
			<SectionHeader title={t('settings.sections.profile')} />

			<div className="flex items-start gap-4 py-4 border-b">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-input bg-background">
					<User className="h-5 w-5 text-muted-foreground" />
				</div>
				<div className="flex flex-1 flex-col gap-3">
					<div className="flex gap-3">
						<Input
							placeholder={t('settings.profile.firstNamePlaceholder')}
							value={profile.firstName}
							onChange={handleProfileChange('firstName')}
							className="flex-1"
						/>
						<Input
							placeholder={t('settings.profile.lastNamePlaceholder')}
							value={profile.lastName}
							onChange={handleProfileChange('lastName')}
							className="flex-1"
						/>
					</div>
					{hasProfileChanges && (
						<div className="flex justify-end gap-2">
							<Button variant="outline" size="sm" onClick={handleCancel}>
								{t('settings.profile.cancel')}
							</Button>
							<Button size="sm" onClick={handleSave}>
								{t('settings.profile.saveChanges')}
							</Button>
						</div>
					)}
				</div>
			</div>

			{/* Application Section */}
			<SectionHeader title={t('settings.sections.application')} />

			<SettingRow label={t('settings.application.name')}>
				<span className="text-sm">{__APP_NAME__}</span>
			</SettingRow>

			<SettingRow label={t('settings.application.description')}>
				<span className="text-sm text-muted-foreground">{__APP_DESCRIPTION__}</span>
			</SettingRow>

			<SettingRow label={t('settings.application.version')}>
				<span className="font-mono text-sm">{__APP_VERSION__}</span>
			</SettingRow>

			<SettingRow label={t('settings.application.author')}>
				<span className="text-sm">{__APP_AUTHOR__}</span>
			</SettingRow>

			<SettingRow label={t('settings.application.license')}>
				<span className="text-sm">{__APP_LICENSE__}</span>
			</SettingRow>

			<SettingRow
				label={t('settings.application.accessibility')}
				description={t('settings.application.accessibilityDescription')}
			>
				<Button variant="outline" size="sm" onClick={handleOpenAccessibility}>
					{t('settings.application.openAccessibility')}
				</Button>
			</SettingRow>

			<SettingRow
				label={t('settings.application.screenRecording')}
				description={t('settings.application.screenRecordingDescription')}
			>
				<Button variant="outline" size="sm" onClick={handleOpenScreenRecording}>
					{t('settings.application.openScreenRecording')}
				</Button>
			</SettingRow>

			<SettingRow
				label={t('settings.application.menuBar')}
				description={t('settings.application.menuBarDescription')}
			>
				<Switch checked={trayEnabled} onCheckedChange={handleTrayToggle} />
			</SettingRow>
		</div>
	);
};

export default GeneralPage;
