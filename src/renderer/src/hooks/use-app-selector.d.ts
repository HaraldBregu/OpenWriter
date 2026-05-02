import type { AppState } from '../contexts/AppContext';
export declare function useAppSelector<T>(selector: (state: AppState) => T): T;
