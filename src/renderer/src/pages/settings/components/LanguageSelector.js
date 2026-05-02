import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Label } from '@/components/ui/Label';
import { useLanguageMode } from '@/hooks/use-language-mode';
import { useAppActions } from '@/hooks/use-app-actions';
export function LanguageSelector() {
    const language = useLanguageMode();
    const { setLanguage } = useAppActions();
    const { t } = useTranslation();
    const languageOptions = [
        {
            value: 'en',
            label: t('settings.language.en'),
            description: t('settings.language.enDescription'),
        },
        {
            value: 'it',
            label: t('settings.language.it'),
            description: t('settings.language.itDescription'),
        },
    ];
    return (_jsx(RadioGroup, { value: language, onValueChange: (value) => setLanguage(value), className: "grid gap-0", "aria-label": t('settings.language.title'), children: languageOptions.map((option) => {
            const descriptionId = `language-${option.value}-description`;
            return (_jsxs("div", { className: "flex items-center justify-between px-4 py-3", children: [_jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsx(Label, { htmlFor: `language-${option.value}`, className: "text-sm font-normal cursor-pointer", children: option.label }), _jsx("span", { id: descriptionId, className: "text-xs text-muted-foreground", children: option.description })] }), _jsx(RadioGroupItem, { id: `language-${option.value}`, value: option.value, "aria-describedby": descriptionId })] }, option.value));
        }) }));
}
