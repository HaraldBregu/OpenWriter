import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionHeader, SettingRow } from '../components';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
const GeneralPage = () => {
    const { t } = useTranslation();
    const [trayEnabled, setTrayEnabled] = useState(true);
    useEffect(() => {
        window.app.getTrayEnabled().then(setTrayEnabled);
    }, []);
    const handleTrayToggle = useCallback((checked) => {
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
    return (_jsxs("div", { className: "w-full max-w-2xl", children: [_jsx("h1", { className: "text-lg font-normal mb-6", children: t('settings.title') }), _jsx(SectionHeader, { title: t('settings.sections.application') }), _jsx(SettingRow, { label: t('settings.application.name'), children: _jsx("span", { className: "text-sm", children: __APP_NAME__ }) }), _jsx(SettingRow, { label: t('settings.application.description'), children: _jsx("span", { className: "text-sm text-muted-foreground", children: __APP_DESCRIPTION__ }) }), _jsx(SettingRow, { label: t('settings.application.version'), children: _jsx("span", { className: "font-mono text-sm", children: __APP_VERSION__ }) }), _jsx(SettingRow, { label: t('settings.application.author'), children: _jsx("span", { className: "text-sm", children: __APP_AUTHOR__ }) }), _jsx(SettingRow, { label: t('settings.application.license'), children: _jsx("span", { className: "text-sm", children: __APP_LICENSE__ }) }), _jsx(SettingRow, { label: t('settings.application.accessibility'), description: t('settings.application.accessibilityDescription'), children: _jsx(Button, { variant: "outline", size: "sm", onClick: handleOpenAccessibility, children: t('settings.application.openAccessibility') }) }), _jsx(SettingRow, { label: t('settings.application.screenRecording'), description: t('settings.application.screenRecordingDescription'), children: _jsx(Button, { variant: "outline", size: "sm", onClick: handleOpenScreenRecording, children: t('settings.application.openScreenRecording') }) }), _jsx(SettingRow, { label: t('settings.application.menuBar'), description: t('settings.application.menuBarDescription'), children: _jsx(Switch, { checked: trayEnabled, onCheckedChange: handleTrayToggle }) }), _jsx(SettingRow, { label: t('settings.application.appData'), description: t('settings.application.appDataDescription'), children: _jsx(Button, { variant: "outline", size: "sm", onClick: handleOpenAppDataFolder, children: t('settings.application.openAppData') }) })] }));
};
export default GeneralPage;
