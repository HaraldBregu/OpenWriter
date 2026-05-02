import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from '@/components/ui/Command';
import { useAppSelector } from '../../../../store';
import { selectAllDocuments } from '../../../../store/workspace';
export function DocumentCommandModal({ open, onOpenChange }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const documentsFromStore = useAppSelector(selectAllDocuments);
    const documents = [...documentsFromStore].sort((a, b) => b.createdAt - a.createdAt);
    function handleSelect(id) {
        onOpenChange(false);
        navigate(`/content/${id}`);
    }
    return (_jsxs(CommandDialog, { open: open, onOpenChange: onOpenChange, title: t('commandPalette.documents.title', 'Open document'), description: t('commandPalette.documents.description', 'Search and open a document'), children: [_jsx(CommandInput, { placeholder: t('commandPalette.documents.placeholder', 'Search documents…') }), _jsxs(CommandList, { children: [_jsx(CommandEmpty, { children: t('commandPalette.documents.empty', 'No documents found.') }), documents.length > 0 && (_jsx(CommandGroup, { heading: t('commandPalette.documents.heading', 'Documents'), children: documents.map((doc) => (_jsxs(CommandItem, { value: `${doc.title || ''} ${doc.id}`, onSelect: () => handleSelect(doc.id), children: [_jsx(FileText, {}), _jsx("span", { className: "flex-1 truncate", children: doc.title || t('sidebar.untitledWriting', 'Untitled') })] }, doc.id))) }))] })] }));
}
