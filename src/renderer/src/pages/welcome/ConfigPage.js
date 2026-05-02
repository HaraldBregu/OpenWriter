import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from '@tanstack/react-form';
import { ArrowRight, Loader2 } from 'lucide-react';
import { AppIconOpenWriter } from '@/components/app';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSet, } from '@/components/ui/Field';
import { H1, H3, H4, Muted, Small } from '@/components/ui/Typography';
import { PageBody, PageContainer } from '@/components/app/base/page';
import { TitleBar } from '@/components/app/titlebar/TitleBar';
import { PROVIDER_CATALOGUE, PROVIDER_IDS, getProvider } from '../../../../shared/providers';
const EMPTY_TOKENS = Object.fromEntries(PROVIDER_IDS.map((providerId) => [providerId, '']));
const PROVIDER_LABELS = Object.fromEntries(PROVIDER_CATALOGUE.map((provider) => [provider.id, provider.name]));
const DEFAULT_VALUES = {
    firstName: '',
    lastName: '',
    tokens: EMPTY_TOKENS,
};
const ConfigPage = ({ onConfigured }) => {
    const { t } = useTranslation();
    const [errorMessage, setErrorMessage] = useState(null);
    const form = useForm({
        defaultValues: DEFAULT_VALUES,
        onSubmit: async ({ value }) => {
            if (typeof window.app?.completeFirstRunConfiguration !== 'function')
                return;
            setErrorMessage(null);
            try {
                const providers = PROVIDER_IDS.flatMap((providerId) => {
                    const catalog = getProvider(providerId);
                    if (!catalog)
                        return [];
                    return [
                        {
                            id: catalog.id,
                            name: catalog.name,
                            apiKey: value.tokens[providerId].trim(),
                        },
                    ];
                });
                const startupInfo = await window.app.completeFirstRunConfiguration({ firstName: value.firstName, lastName: value.lastName }, providers);
                onConfigured(startupInfo);
            }
            catch (error) {
                setErrorMessage(error instanceof Error
                    ? error.message
                    : t('startup.firstTime.error', 'Unable to save your provider tokens right now. Please try again.'));
            }
        },
    });
    return (_jsxs(PageContainer, { className: "h-screen", children: [_jsx(TitleBar, { title: "OpenWriter" }), _jsx(PageBody, { className: "p-0", children: _jsxs("div", { className: "grid min-h-full lg:grid-cols-2", children: [_jsx("div", { className: "flex flex-col gap-4 p-6 md:p-10 overflow-y-auto lg:order-2", children: _jsx("div", { className: "flex flex-1 items-center justify-center", children: _jsx("div", { className: "w-full max-w-sm", children: _jsx("form", { onSubmit: (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            form.handleSubmit();
                                        }, className: "flex flex-col gap-6", noValidate: true, children: _jsxs(FieldGroup, { children: [_jsxs("div", { className: "flex flex-col gap-2 text-left", children: [_jsx(H3, { children: t('startup.firstTime.title', 'Get started') }), _jsx(Muted, { children: t('startup.firstTime.description', 'Add your name and at least one API key.') })] }), _jsx(FieldSet, { children: _jsxs(FieldGroup, { children: [_jsx(form.Field, { name: "firstName", validators: {
                                                                    onChange: ({ value }) => value.trim().length === 0
                                                                        ? t('startup.firstTime.firstNameRequired', 'First name is required')
                                                                        : undefined,
                                                                }, children: (field) => {
                                                                    const showError = field.state.meta.isTouched &&
                                                                        field.state.meta.errors.length > 0;
                                                                    return (_jsxs(Field, { "data-invalid": showError || undefined, children: [_jsx(FieldLabel, { htmlFor: field.name, children: t('settings.profile.firstName', 'First name') }), _jsx(Input, { id: field.name, name: field.name, value: field.state.value, onBlur: field.handleBlur, onChange: (e) => {
                                                                                    field.handleChange(e.target.value);
                                                                                    if (errorMessage)
                                                                                        setErrorMessage(null);
                                                                                }, placeholder: "Ada", autoComplete: "given-name", "aria-invalid": showError }), showError && (_jsx(FieldError, { children: String(field.state.meta.errors[0]) }))] }));
                                                                } }), _jsx(form.Field, { name: "lastName", validators: {
                                                                    onChange: ({ value }) => value.trim().length === 0
                                                                        ? t('startup.firstTime.lastNameRequired', 'Last name is required')
                                                                        : undefined,
                                                                }, children: (field) => {
                                                                    const showError = field.state.meta.isTouched &&
                                                                        field.state.meta.errors.length > 0;
                                                                    return (_jsxs(Field, { "data-invalid": showError || undefined, children: [_jsx(FieldLabel, { htmlFor: field.name, children: t('settings.profile.lastName', 'Last name') }), _jsx(Input, { id: field.name, name: field.name, value: field.state.value, onBlur: field.handleBlur, onChange: (e) => {
                                                                                    field.handleChange(e.target.value);
                                                                                    if (errorMessage)
                                                                                        setErrorMessage(null);
                                                                                }, placeholder: "Lovelace", autoComplete: "family-name", "aria-invalid": showError }), showError && (_jsx(FieldError, { children: String(field.state.meta.errors[0]) }))] }));
                                                                } })] }) }), _jsx(FieldSet, { children: _jsxs(FieldGroup, { children: [PROVIDER_IDS.map((providerId) => (_jsx(form.Field, { name: `tokens.${providerId}`, children: (field) => (_jsxs(Field, { children: [_jsxs(FieldLabel, { htmlFor: `first-run-${providerId}`, children: [PROVIDER_LABELS[providerId], _jsx("span", { className: "ml-1 text-xs font-normal text-muted-foreground", children: t('startup.firstTime.optional', '(optional)') })] }), _jsx(Input, { id: `first-run-${providerId}`, type: "password", value: field.state.value, onBlur: field.handleBlur, onChange: (e) => {
                                                                                field.handleChange(e.target.value);
                                                                                if (errorMessage)
                                                                                    setErrorMessage(null);
                                                                            }, placeholder: t('startup.firstTime.tokenPlaceholder', 'sk-•••••••••••••••••••••'), autoComplete: "off", spellCheck: false, className: "font-mono" })] })) }, providerId))), _jsx(FieldDescription, { children: t('startup.firstTime.tokensHint', 'Add at least one to start writing. Keys are encrypted with your OS keychain — never synced, never logged.') })] }) }), errorMessage && (_jsx("p", { className: "text-xs text-destructive", children: errorMessage })), _jsxs(Field, { children: [_jsx(form.Subscribe, { selector: (s) => [s.canSubmit, s.isSubmitting], children: ([canSubmit, isSubmitting]) => (_jsx(Button, { type: "submit", disabled: !canSubmit || isSubmitting, className: "w-full", children: isSubmitting ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "animate-spin" }), t('startup.firstTime.saving', 'Setting things up…')] })) : (_jsxs(_Fragment, { children: [t('startup.firstTime.save', 'Enter OpenWriter'), _jsx(ArrowRight, {})] })) })) }), _jsx(FieldDescription, { className: "text-center", children: t('startup.firstTime.privacy', 'By continuing you agree to the Terms and Privacy Policy.') })] })] }) }) }) }) }), _jsxs("div", { className: "relative hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:order-1 p-10 gap-10 border-r border-sidebar-border", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(AppIconOpenWriter, { className: "size-12 text-sidebar-primary", "aria-hidden": "true" }), _jsxs("div", { className: "flex flex-col", children: [_jsx(H4, { className: "text-sidebar-foreground leading-tight", children: "OpenWriter" }), _jsx(Small, { className: "text-sidebar-foreground/60 font-normal tracking-wide", children: t('startup.firstTime.slogan', 'Write freely. Own everything.') })] })] }), _jsxs("div", { className: "flex flex-1 flex-col justify-center gap-6 max-w-md", children: [_jsx(H1, { className: "text-left text-4xl font-semibold leading-tight text-sidebar-foreground", children: t('startup.firstTime.leftTitle', 'Your writing, your models, your machine.') }), _jsx(Muted, { className: "text-sidebar-foreground/70 leading-relaxed", children: t('startup.firstTime.leftDescription', 'OpenWriter is a local-first writing studio. Bring your own keys for OpenAI, Anthropic, Google, and more — drafts and credentials never leave your device.') }), _jsxs("ul", { className: "flex flex-col gap-3 text-sm text-sidebar-foreground/80", children: [_jsxs("li", { className: "flex gap-2", children: [_jsx("span", { "aria-hidden": "true", className: "text-sidebar-primary", children: "\u2192" }), t('startup.firstTime.leftBullet1', 'Encrypted local storage. No accounts, no cloud sync.')] }), _jsxs("li", { className: "flex gap-2", children: [_jsx("span", { "aria-hidden": "true", className: "text-sidebar-primary", children: "\u2192" }), t('startup.firstTime.leftBullet2', 'Switch providers per document. Compare answers side-by-side.')] }), _jsxs("li", { className: "flex gap-2", children: [_jsx("span", { "aria-hidden": "true", className: "text-sidebar-primary", children: "\u2192" }), t('startup.firstTime.leftBullet3', 'Works offline once your keys are configured.')] })] })] }), _jsxs("footer", { className: "flex flex-col gap-2 text-xs text-sidebar-foreground/60 max-w-md", children: [_jsx(Small, { className: "font-normal", children: t('startup.firstTime.leftFooterTagline', 'Built by writers, for writers. Free and open source.') }), _jsxs("div", { className: "flex gap-4", children: [_jsx("a", { href: "#", className: "hover:underline", children: t('startup.firstTime.leftFooterPrivacy', 'Privacy') }), _jsx("a", { href: "#", className: "hover:underline", children: t('startup.firstTime.leftFooterTerms', 'Terms') }), _jsx("a", { href: "#", className: "hover:underline", children: t('startup.firstTime.leftFooterDocs', 'Documentation') }), _jsxs("span", { className: "ml-auto", children: ["v", __APP_VERSION__] })] })] })] })] }) })] }));
};
export default ConfigPage;
