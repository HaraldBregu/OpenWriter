import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Inbox } from 'lucide-react';
import { SectionHeader, SettingRow } from '../components';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import {
	ItemRow,
	ItemRowMedia,
	ItemRowContent,
	ItemRowTitle,
	ItemRowDescription,
} from '@/components/ui/ItemRow';

const GeneralPage: React.FC = () => {
	const { t } = useTranslation();

	const [trayEnabled, setTrayEnabled] = useState(true);

	useEffect(() => {
		window.app.getTrayEnabled().then(setTrayEnabled);
	}, []);

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
		<div className="w-full max-w-2xl">
			<h1 className="text-lg font-normal mb-6">{t('settings.title')}</h1>

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

			<SettingRow
				label={t('settings.application.appData')}
				description={t('settings.application.appDataDescription')}
			>
				<Button variant="outline" size="sm" onClick={handleOpenAppDataFolder}>
					{t('settings.application.openAppData')}
				</Button>
			</SettingRow>

			<ItemRow variant="outline">
				<ItemRowContent>
					<ItemRowTitle>Default Size</ItemRowTitle>
					<ItemRowDescription>The standard size for most use cases.</ItemRowDescription>
				</ItemRowContent>
			</ItemRow>
		</div>
	);
};

export default GeneralPage;
