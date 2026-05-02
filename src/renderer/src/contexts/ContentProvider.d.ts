import { type ReactElement, type ReactNode } from 'react';
import type { ResourceInfo } from '../../../shared/types';
export interface ContentContextValue {
    contents: ResourceInfo[];
    isLoading: boolean;
    refresh: () => Promise<void>;
    removeContent: (id: string) => void;
}
interface ContentProviderProps {
    readonly children: ReactNode;
}
export declare function ContentProvider({ children }: ContentProviderProps): ReactElement;
export declare function useContentContext(): ContentContextValue;
export {};
