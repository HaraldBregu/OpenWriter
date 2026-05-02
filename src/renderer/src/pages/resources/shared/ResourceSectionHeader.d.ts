interface ResourceSectionHeaderProps {
    readonly title: string;
    readonly uploading: boolean;
    readonly uploadLabel: string;
    readonly onUpload: () => void;
    readonly editing: boolean;
    readonly onToggleEdit: () => void;
    readonly selectedCount: number;
    readonly removing: boolean;
    readonly onRemove: () => void;
    readonly indexing: boolean;
    readonly showIndexButton: boolean;
    readonly onIndex: () => void;
    readonly onOpenFolder: () => void;
}
export declare const ResourceSectionHeader: import("react").NamedExoticComponent<ResourceSectionHeaderProps>;
export {};
