import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserCircle } from 'lucide-react';
import { SectionHeader, SettingRow } from '../components';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Large, Muted, Small } from '@/components/ui/Typography';
const EMPTY_PROFILE = { firstName: '', lastName: '' };
const EditableName = ({ value, editing, onStartEdit, onCommit, onCancel, }) => {
    const [draft, setDraft] = useState(value);
    useEffect(() => {
        if (editing)
            setDraft(value);
    }, [editing, value]);
    if (!editing) {
        return (_jsx(Small, { onDoubleClick: onStartEdit, className: "cursor-text select-none", children: value || '—' }));
    }
    return (_jsx(Input, { autoFocus: true, onFocus: (e) => e.currentTarget.select(), value: draft, onChange: (e) => setDraft(e.target.value), onBlur: () => onCommit(draft), onKeyDown: (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                onCommit(draft);
            }
            else if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            }
        }, className: "h-7 w-48" }));
};
const AccountPage = () => {
    const { t } = useTranslation();
    const [profile, setProfile] = useState(EMPTY_PROFILE);
    const [hasProfile, setHasProfile] = useState(false);
    const [editing, setEditing] = useState(null);
    useEffect(() => {
        let cancelled = false;
        window.app
            .getProfile()
            .then((p) => {
            if (cancelled)
                return;
            if (p) {
                setProfile(p);
                setHasProfile(true);
            }
        })
            .catch(() => { });
        return () => {
            cancelled = true;
        };
    }, []);
    const persist = useCallback((field, raw) => {
        const trimmed = raw.trim();
        if (trimmed === profile[field]) {
            setEditing(null);
            return;
        }
        const next = { ...profile, [field]: trimmed };
        setProfile(next);
        setEditing(null);
        window.app
            .setProfile(next)
            .then((saved) => {
            setProfile(saved);
            setHasProfile(true);
        })
            .catch(() => { });
    }, [profile]);
    const fullName = `${profile.firstName} ${profile.lastName}`.trim();
    const displayName = fullName || t('settings.account.guest');
    const subtitle = hasProfile
        ? t('settings.account.signedIn')
        : t('settings.account.notSignedIn');
    return (_jsxs("div", { className: "w-full max-w-2xl", children: [_jsx(Large, { className: "mb-6 font-normal", children: t('settings.tabs.account') }), _jsx(SectionHeader, { title: t('settings.account.section') }), _jsxs("div", { className: "flex items-start gap-4 py-4 border-b", children: [_jsx("div", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-input bg-background", children: _jsx(UserCircle, { className: "h-5 w-5 text-muted-foreground" }) }), _jsxs("div", { className: "flex flex-1 flex-col", children: [_jsx(Small, { children: displayName }), _jsx(Muted, { className: "text-xs", children: subtitle })] })] }), _jsx(SettingRow, { label: t('settings.account.firstName'), description: t('settings.account.editHint'), children: _jsx(EditableName, { value: profile.firstName, editing: editing === 'firstName', onStartEdit: () => setEditing('firstName'), onCommit: (v) => persist('firstName', v), onCancel: () => setEditing(null) }) }), _jsx(SettingRow, { label: t('settings.account.lastName'), description: t('settings.account.editHint'), children: _jsx(EditableName, { value: profile.lastName, editing: editing === 'lastName', onStartEdit: () => setEditing('lastName'), onCommit: (v) => persist('lastName', v), onCancel: () => setEditing(null) }) }), _jsx(SettingRow, { label: t('settings.account.signIn'), description: t('settings.account.signInDescription'), children: _jsx(Button, { variant: "outline", size: "sm", disabled: true, children: t('settings.account.signIn') }) })] }));
};
export default AccountPage;
