import { type ReactElement, type ReactNode } from 'react';
import type { ImageEntry } from '../../../shared/types';
export interface ImagesContextValue {
    images: ImageEntry[];
    isLoading: boolean;
    refresh: () => Promise<void>;
    removeImage: (id: string) => void;
}
interface ImagesProviderProps {
    readonly children: ReactNode;
}
export declare function ImagesProvider({ children }: ImagesProviderProps): ReactElement;
export declare function useImagesContext(): ImagesContextValue;
export {};
