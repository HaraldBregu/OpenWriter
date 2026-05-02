import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Label } from '@/components/ui/Label';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { useAppActions } from '@/hooks/use-app-actions';
export function ThemeModeSelector() {
    const themeMode = useThemeMode();
    const { setTheme } = useAppActions();
    const { t } = useTranslation();
    const themeOptions = [
        {
            value: 'light',
            label: t('settings.theme.light'),
            description: t('settings.theme.lightDescription'),
        },
        {
            value: 'dark',
            label: t('settings.theme.dark'),
            description: t('settings.theme.darkDescription'),
        },
        {
            value: 'system',
            label: t('settings.theme.system'),
            description: t('settings.theme.systemDescription'),
        },
    ];
    return (_jsx(RadioGroup, { value: themeMode, onValueChange: (value) => setTheme(value), className: "grid gap-0", "aria-label": t('settings.theme.title'), children: themeOptions.map((option) => {
            const descriptionId = `theme-${option.value}-description`;
            return (_jsxs("div", { className: "flex items-center justify-between px-4 py-3", children: [_jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsx(Label, { htmlFor: `theme-${option.value}`, className: "text-sm font-normal cursor-pointer", children: option.label }), _jsx("span", { id: descriptionId, className: "text-xs text-muted-foreground", children: option.description })] }), _jsx(RadioGroupItem, { id: `theme-${option.value}`, value: option.value, "aria-describedby": descriptionId })] }, option.value));
        }) }));
}
