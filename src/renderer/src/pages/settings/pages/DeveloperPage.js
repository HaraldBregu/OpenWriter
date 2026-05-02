import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/Switch';
import { SectionHeader, SettingRow } from '../components';
const DeveloperPage = () => {
    const { t } = useTranslation();
    const [developerMode, setDeveloperMode] = useState(false);
    const handleToggle = useCallback((checked) => {
        setDeveloperMode(checked);
    }, []);
    return (_jsxs("div", { className: "w-full max-w-2xl", children: [_jsx("h1", { className: "text-lg font-normal mb-6", children: t('settings.tabs.developer') }), _jsx(SectionHeader, { title: t('settings.sections.developer') }), _jsx(SettingRow, { label: t('settings.developer.mode'), description: t('settings.developer.modeDescription'), children: _jsx(Switch, { checked: developerMode, onCheckedChange: handleToggle }) })] }));
};
export default DeveloperPage;
