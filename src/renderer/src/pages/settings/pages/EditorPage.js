import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, } from '@/components/ui/Select';
import { SectionHeader, SettingRow } from '../components';
const FONT_OPTIONS = [
    { value: 'default', labelKey: 'settings.editor.fontDefault' },
    { value: 'sans-system', labelKey: 'settings.editor.fontSansSystem' },
    { value: 'dyslexic-friendly', labelKey: 'settings.editor.fontDyslexicFriendly' },
];
const EditorPage = () => {
    const { t } = useTranslation();
    const [font, setFont] = useState('default');
    const handleFontChange = useCallback((next) => {
        if (next !== null)
            setFont(next);
    }, []);
    return (_jsxs("div", { className: "w-full max-w-2xl", children: [_jsx("h1", { className: "text-lg font-normal mb-6", children: t('settings.tabs.editor') }), _jsx(SectionHeader, { title: t('settings.sections.editor') }), _jsx(SettingRow, { label: t('settings.editor.font'), description: t('settings.editor.fontDescription'), children: _jsxs(Select, { value: font, onValueChange: handleFontChange, children: [_jsx(SelectTrigger, { className: "w-44 h-8 text-sm", "aria-label": t('settings.editor.font'), children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: FONT_OPTIONS.map((option) => (_jsx(SelectItem, { value: option.value, children: t(option.labelKey) }, option.value))) })] }) })] }));
};
export default EditorPage;
