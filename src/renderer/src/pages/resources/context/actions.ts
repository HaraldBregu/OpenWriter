import type { ResourceInfo } from '../../../../../shared/types';

export type ResourcesAction =
	| { type: 'SET_RESOURCES'; payload: ResourceInfo[] }
	| { type: 'SET_IS_LOADING'; payload: boolean }
	| { type: 'SET_UPLOADING'; payload: boolean }
	| { type: 'SET_SEARCH_QUERY'; payload: string }
	| { type: 'SET_EDITING'; payload: boolean }
	| { type: 'SET_CONFIRM_OPEN'; payload: boolean }
	| { type: 'SET_REMOVING'; payload: boolean };
