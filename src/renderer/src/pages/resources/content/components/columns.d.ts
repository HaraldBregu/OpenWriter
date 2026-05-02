import type { ColumnDef } from '@tanstack/react-table';
import type { ResourceInfo } from '../../../../../../shared/types';
interface ColumnsOptions {
    onPreview: (item: ResourceInfo) => void;
    onOpenInFinder: () => void;
    onDelete: (id: string) => void;
}
export declare function buildColumns({ onPreview, onOpenInFinder, onDelete, }: ColumnsOptions): ColumnDef<ResourceInfo>[];
export {};
