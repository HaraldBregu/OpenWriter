import type { TrackedTask } from './types';
interface TaskDataDialogProps {
    task: TrackedTask | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}
export declare function TaskDataDialog({ task, open, onOpenChange }: TaskDataDialogProps): import("react/jsx-runtime").JSX.Element;
export {};
