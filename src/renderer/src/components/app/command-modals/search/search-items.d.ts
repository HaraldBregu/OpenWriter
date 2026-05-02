import type { LucideIcon } from 'lucide-react';
import type { AppSearchActionDefinition, AppSearchResultSection, SearchableDocument, SearchableResource } from './types';
interface SectionLabel {
    title: string;
}
interface BuildSearchSectionsParams {
    query: string;
    documents: SearchableDocument[];
    resources: SearchableResource[];
    actions: AppSearchActionDefinition[];
    icons: {
        document: LucideIcon;
        resource: LucideIcon;
    };
    labels: {
        actions: SectionLabel;
        documents: SectionLabel;
        resources: SectionLabel;
    };
}
export declare function buildAppSearchSections({ query, documents, resources, actions, icons, labels, }: BuildSearchSectionsParams): AppSearchResultSection[];
export {};
