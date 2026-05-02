import type { TrackedTask } from './types';
interface LogPanelProps {
    task: TrackedTask;
    onClose: () => void;
}
export declare function LogPanel({ task, onClose }: LogPanelProps): import("react/jsx-runtime").JSX.Element;
export {};
