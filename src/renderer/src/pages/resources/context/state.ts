import type { ResourceInfo } from '../../../../../shared/types';

export interface ResourcesState {
	resources: ResourceInfo[];
	isLoading: boolean;
	uploading: boolean;
	searchQuery: string;
	editing: boolean;
	confirmOpen: boolean;
	removing: boolean;
}

export const initialState: ResourcesState = {
	resources: [],
	isLoading: true,
	uploading: false,
	searchQuery: '',
	editing: false,
	confirmOpen: false,
	removing: false,
};
