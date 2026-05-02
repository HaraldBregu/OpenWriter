import { type LucideIcon } from 'lucide-react';
interface ResourceEmptyStateProps {
    readonly icon: LucideIcon;
    readonly message: string;
    readonly uploadLabel: string;
    readonly uploading: boolean;
    readonly onUpload: () => void;
}
export declare const ResourceEmptyState: import("react").NamedExoticComponent<ResourceEmptyStateProps>;
export {};
