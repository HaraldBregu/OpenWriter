import type { AppSearchActionDefinition } from './types';
export declare const APP_SEARCH_RESULTS_PER_SECTION = 6;
export declare const APP_SEARCH_RESULT_KIND_LABELS: {
    readonly action: "Action";
    readonly document: "Document";
    readonly resource: "Resource";
};
export declare const APP_SEARCH_ACTIONS: AppSearchActionDefinition[];
export declare const APP_SEARCH_SECTION_ICONS: {
    readonly actions: import("react").ForwardRefExoticComponent<Omit<import("lucide-react").LucideProps, "ref"> & import("react").RefAttributes<SVGSVGElement>>;
    readonly documents: import("react").ForwardRefExoticComponent<Omit<import("lucide-react").LucideProps, "ref"> & import("react").RefAttributes<SVGSVGElement>>;
    readonly resources: import("react").ForwardRefExoticComponent<Omit<import("lucide-react").LucideProps, "ref"> & import("react").RefAttributes<SVGSVGElement>>;
};
