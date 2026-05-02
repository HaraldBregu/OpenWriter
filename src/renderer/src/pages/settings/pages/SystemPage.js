import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ButtonGroup } from '@/components/ui/ButtonGroup';
import { Moon, Monitor, Sun } from 'lucide-react';
import { SectionHeader, SettingRow } from '../components';
import { useAppActions } from '@/hooks/use-app-actions';
import { useLanguageMode } from '@/hooks/use-language-mode';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { applyThemeTokens, clearThemeTokens, resolveEffectiveVariant, THEME_STYLE_STORAGE_KEY, DEFAULT_THEME_ID, } from '../../../lib/theme-tokens';
const LANGUAGE_OPTIONS = [
    { value: 'en', labelKey: 'settings.language.en' },
    { value: 'it', labelKey: 'settings.language.it' },
];
// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const SystemPage = () => {
    const { t } = useTranslation();
    const themeMode = useThemeMode();
    const language = useLanguageMode();
    const { setTheme, setLanguage } = useAppActions();
    const [customThemes, setCustomThemes] = useState([]);
    const [activeThemeId, setActiveThemeId] = useState(() => {
        try {
            return localStorage.getItem(THEME_STYLE_STORAGE_KEY) ?? DEFAULT_THEME_ID;
        }
        catch {
            return DEFAULT_THEME_ID;
        }
    });
    const loadCustomThemes = useCallback(async () => {
        try {
            const list = await window.app.getCustomThemes();
            setCustomThemes(list);
        }
        catch {
            setCustomThemes([]);
        }
    }, []);
    useEffect(() => {
        loadCustomThemes();
    }, [loadCustomThemes]);
    const handleThemeStyleChange = useCallback(async (next) => {
        if (next === null)
            return;
        setActiveThemeId(next);
        try {
            localStorage.setItem(THEME_STYLE_STORAGE_KEY, next);
        }
        catch {
            /* empty */
        }
        if (next === DEFAULT_THEME_ID) {
            clearThemeTokens();
            return;
        }
        const manifest = await window.app.getCustomThemeTokens(next);
        if (!manifest)
            return;
        const variant = resolveEffectiveVariant();
        applyThemeTokens(manifest[variant]);
    }, []);
    const handleThemeChange = (next) => {
        setTheme(next);
    };
    const handleLanguageChange = (next) => {
        if (next === null)
            return;
        const option = LANGUAGE_OPTIONS.find((o) => o.value === next);
        if (option)
            setLanguage(option.value);
    };
    return (_jsxs("div", { className: "w-full max-w-2xl", children: [_jsx("h1", { className: "text-lg font-normal mb-6", children: t('settings.tabs.system') }), _jsx(SectionHeader, { title: t('settings.sections.layout') }), _jsx(SettingRow, { label: t('settings.theme.title'), description: t('settings.theme.description'), children: _jsxs(ButtonGroup, { children: [_jsx(Button, { variant: themeMode === 'light' ? 'outline-selected' : 'outline', size: "icon-sm", onClick: () => handleThemeChange('light'), "aria-label": t('settings.theme.light'), "aria-pressed": themeMode === 'light', children: _jsx(Sun, { className: "size-3.5" }) }), _jsx(Button, { variant: themeMode === 'system' ? 'outline-selected' : 'outline', size: "icon-sm", onClick: () => handleThemeChange('system'), "aria-label": t('settings.theme.system'), "aria-pressed": themeMode === 'system', children: _jsx(Monitor, { className: "size-3.5" }) }), _jsx(Button, { variant: themeMode === 'dark' ? 'outline-selected' : 'outline', size: "icon-sm", onClick: () => handleThemeChange('dark'), "aria-label": t('settings.theme.dark'), "aria-pressed": themeMode === 'dark', children: _jsx(Moon, { className: "size-3.5" }) })] }) }), _jsx(SettingRow, { label: t('settings.appTheme.title'), description: t('settings.appTheme.description'), children: _jsxs(Select, { value: activeThemeId, onValueChange: handleThemeStyleChange, children: [_jsx(SelectTrigger, { className: "w-32 h-8 text-sm", "aria-label": t('settings.appTheme.title'), children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: DEFAULT_THEME_ID, children: t('settings.appTheme.default') }), customThemes.map((theme) => (_jsx(SelectItem, { value: theme.id, children: theme.name }, theme.id)))] })] }) }), _jsx(SettingRow, { label: t('settings.language.title'), description: t('settings.language.description'), children: _jsxs(Select, { value: language, onValueChange: handleLanguageChange, children: [_jsx(SelectTrigger, { className: "w-32 h-8 text-sm", "aria-label": t('settings.language.title'), children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: LANGUAGE_OPTIONS.map((option) => (_jsx(SelectItem, { value: option.value, children: t(option.labelKey) }, option.value))) })] }) })] }));
};
export default SystemPage;
