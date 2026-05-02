import type { ComponentType } from 'react';
import { ShortcutId } from '../../../../../../shared/shortcuts';
import type { CommandModalId } from '../context/CommandModalContext';
export interface CommandModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}
interface CommandModalDefinition {
    id: CommandModalId;
    shortcutId?: ShortcutId;
    Component: ComponentType<CommandModalProps>;
}
export declare const COMMAND_MODAL_DEFINITIONS: CommandModalDefinition[];
export declare const SHORTCUT_TO_COMMAND_MODAL: Partial<Record<ShortcutId, CommandModalId>>;
export {};
