import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionHeader } from '../components';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import {
	ItemRow,
	ItemRowActions,
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

			<div className="flex flex-col gap-2">
				<ItemRow variant="bottom-bordered" size="none">
					<ItemRowContent>
						<ItemRowTitle>{t('settings.application.name')}</ItemRowTitle>
					</ItemRowContent>
					<ItemRowActions>
						<span className="text-sm">{__APP_NAME__}</span>
					</ItemRowActions>
				</ItemRow>

				<ItemRow variant="bottom-bordered" size="none">
					<ItemRowContent>
						<ItemRowTitle>{t('settings.application.description')}</ItemRowTitle>
					</ItemRowContent>
					<ItemRowActions>
						<span className="text-sm text-muted-foreground">{__APP_DESCRIPTION__}</span>
					</ItemRowActions>
				</ItemRow>

				<ItemRow variant="bottom-bordered" size="none">
					<ItemRowContent>
						<ItemRowTitle>{t('settings.application.version')}</ItemRowTitle>
					</ItemRowContent>
					<ItemRowActions>
						<span className="font-mono text-sm">{__APP_VERSION__}</span>
					</ItemRowActions>
				</ItemRow>

				<ItemRow variant="bottom-bordered" size="none">
					<ItemRowContent>
						<ItemRowTitle>{t('settings.application.author')}</ItemRowTitle>
					</ItemRowContent>
					<ItemRowActions>
						<span className="text-sm">{__APP_AUTHOR__}</span>
					</ItemRowActions>
				</ItemRow>

				<ItemRow variant="bottom-bordered" size="none">
					<ItemRowContent>
						<ItemRowTitle>{t('settings.application.license')}</ItemRowTitle>
					</ItemRowContent>
					<ItemRowActions>
						<span className="text-sm">{__APP_LICENSE__}</span>
					</ItemRowActions>
				</ItemRow>

				<ItemRow variant="bottom-bordered" size="none">
					<ItemRowContent>
						<ItemRowTitle>{t('settings.application.accessibility')}</ItemRowTitle>
						<ItemRowDescription>
							{t('settings.application.accessibilityDescription')}
						</ItemRowDescription>
					</ItemRowContent>
					<ItemRowActions>
						<Button variant="outline" size="sm" onClick={handleOpenAccessibility}>
							{t('settings.application.openAccessibility')}
						</Button>
					</ItemRowActions>
				</ItemRow>

				<ItemRow variant="bottom-bordered" size="none">
					<ItemRowContent>
						<ItemRowTitle>{t('settings.application.screenRecording')}</ItemRowTitle>
						<ItemRowDescription>
							{t('settings.application.screenRecordingDescription')}
						</ItemRowDescription>
					</ItemRowContent>
					<ItemRowActions>
						<Button variant="outline" size="sm" onClick={handleOpenScreenRecording}>
							{t('settings.application.openScreenRecording')}
						</Button>
					</ItemRowActions>
				</ItemRow>

				<ItemRow variant="bottom-bordered" size="none">
					<ItemRowContent>
						<ItemRowTitle>{t('settings.application.menuBar')}</ItemRowTitle>
						<ItemRowDescription>
							{t('settings.application.menuBarDescription')}
						</ItemRowDescription>
					</ItemRowContent>
					<ItemRowActions>
						<Switch checked={trayEnabled} onCheckedChange={handleTrayToggle} />
					</ItemRowActions>
				</ItemRow>

				<ItemRow variant="bottom-bordered" size="none">
					<ItemRowContent>
						<ItemRowTitle>{t('settings.application.appData')}</ItemRowTitle>
						<ItemRowDescription>
							{t('settings.application.appDataDescription')}
						</ItemRowDescription>
					</ItemRowContent>
					<ItemRowActions>
						<Button variant="outline" size="sm" onClick={handleOpenAppDataFolder}>
							{t('settings.application.openAppData')}
						</Button>
					</ItemRowActions>
				</ItemRow>
			</div>
		</div>
	);
};

export default GeneralPage;
