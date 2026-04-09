import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Upload, Check } from 'lucide-react';
import { AppButton } from '@/components/app';
import { SectionHeader, SettingRow } from './SettingsComponents';
import { useCustomThemeId, useAppActions } from '../../contexts';
import type { CustomThemeInfo } from '../../../../shared/types';

const ThemesSettingsPage: React.FC = () => {
	const { t } = useTranslation();
	const [themes, setThemes] = useState<CustomThemeInfo[]>([]);
	const customThemeId = useCustomThemeId();
	const { setCustomTheme } = useAppActions();

	const loadThemes = useCallback(async () => {
		try {
			const list = await window.app.getCustomThemes();
			setThemes(list);
		} catch {
			setThemes([]);
		}
	}, []);

	useEffect(() => {
		loadThemes();
	}, [loadThemes]);

	const handleOpenFolder = useCallback(async () => {
		await window.app.openThemesFolder();
	}, []);

	const handleImport = useCallback(async () => {
		const result = await window.app.importTheme();
		if (result) {
			await loadThemes();
		}
	}, [loadThemes]);

	const handleSelect = useCallback(
		(id: string) => {
			setCustomTheme(customThemeId === id ? null : id);
		},
		[customThemeId, setCustomTheme]
	);

	return (
		<div className="w-full max-w-2xl p-4 sm:p-6">
			<h1 className="text-lg font-normal mb-6">{t('settings.themes.title')}</h1>

			<SectionHeader title={t('settings.themes.actions')} />
			<div className="flex gap-2 py-3 border-b">
				<AppButton variant="outline" size="sm" onClick={handleOpenFolder}>
					<FolderOpen size={14} className="mr-1.5" />
					{t('settings.themes.openFolder')}
				</AppButton>
				<AppButton variant="outline" size="sm" onClick={handleImport}>
					<Upload size={14} className="mr-1.5" />
					{t('settings.themes.import')}
				</AppButton>
			</div>

			<SectionHeader title={t('settings.themes.installed')} />
			{themes.length === 0 ? (
				<p className="text-sm text-muted-foreground py-3">{t('settings.themes.noThemes')}</p>
			) : (
				themes.map((theme) => {
					const isActive = customThemeId === theme.id;
					return (
						<SettingRow
							key={theme.id}
							label={theme.name}
							description={`${theme.author} · v${theme.version}`}
						>
							<AppButton
								variant={isActive ? 'default' : 'outline'}
								size="sm"
								onClick={() => handleSelect(theme.id)}
								aria-pressed={isActive}
							>
								{isActive && <Check size={14} className="mr-1" />}
								{isActive ? t('settings.themes.active') : t('settings.themes.activate')}
							</AppButton>
						</SettingRow>
					);
				})
			)}
		</div>
	);
};

export default ThemesSettingsPage;
