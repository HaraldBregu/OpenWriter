import type { TrackedTask } from './types';
interface TaskRowProps {
    task: TrackedTask;
    isSelected: boolean;
    onSelect: () => void;
    onCancel: () => void;
    onHide: () => void;
    onViewData: () => void;
}
export declare function TaskRow({ task, isSelected, onSelect, onCancel, onHide, onViewData }: TaskRowProps): import("react/jsx-runtime").JSX.Element;
export {};
