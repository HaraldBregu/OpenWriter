import { type LucideIcon } from 'lucide-react';
import { type ResourceInfo } from '../../../../../shared/types';
export type ResourceSectionId = 'files' | 'content';
export interface ResourceSectionConfig {
    readonly id: ResourceSectionId;
    readonly route: string;
    readonly titleKey: string;
    readonly emptyKey: string;
    readonly loadingKey: string;
    readonly uploadKey: string;
    readonly searchPlaceholderKey: string;
    readonly icon: LucideIcon;
    readonly uploadExtensions: string[];
    readonly supportsIndexing: boolean;
}
export declare const RESOURCE_SECTION_ORDER: ResourceSectionId[];
export declare const RESOURCE_SECTIONS: Record<ResourceSectionId, ResourceSectionConfig>;
export declare function getResourceSection(resource: ResourceInfo): ResourceSectionId;
export declare function filterResourcesBySection(resources: ResourceInfo[], sectionId: ResourceSectionId): ResourceInfo[];
export declare function getResourceSectionRoute(sectionId: ResourceSectionId): string;
