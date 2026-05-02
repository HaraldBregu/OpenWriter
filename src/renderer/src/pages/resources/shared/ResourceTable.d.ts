import type { ResourceInfo } from '../../../../../shared/types';
interface ResourceTableProps {
    readonly resources: ResourceInfo[];
    readonly searchPlaceholder: string;
    readonly editing: boolean;
    readonly selected: Set<string>;
    readonly onSelectedChange: (selected: Set<string>) => void;
}
export declare const ResourceTable: import("react").NamedExoticComponent<ResourceTableProps>;
export {};
