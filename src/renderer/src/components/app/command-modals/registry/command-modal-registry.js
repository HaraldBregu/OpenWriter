import { ShortcutId } from '../../../../../../shared/shortcuts';
import { AppSearchCommandModal } from '../modals/AppSearchCommandModal';
import { DocumentCommandModal } from '../modals/DocumentCommandModal';
export const COMMAND_MODAL_DEFINITIONS = [
    {
        id: 'search',
        shortcutId: ShortcutId.openAppSearch,
        Component: AppSearchCommandModal,
    },
    {
        id: 'documents',
        shortcutId: ShortcutId.openDocumentList,
        Component: DocumentCommandModal,
    },
];
export const SHORTCUT_TO_COMMAND_MODAL = COMMAND_MODAL_DEFINITIONS.reduce((acc, definition) => {
    if (definition.shortcutId) {
        acc[definition.shortcutId] = definition.id;
    }
    return acc;
}, {});
