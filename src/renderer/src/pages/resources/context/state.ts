import type { ResourceInfo } from '../../../../../shared/types';

export interface ContentState {
	contents: ResourceInfo[];
	isLoading: boolean;
	uploading: boolean;
	searchQuery: string;
	editing: boolean;
	confirmOpen: boolean;
	removing: boolean;
}

export const initialState: ContentState = {
	contents: [],
	isLoading: true,
	uploading: false,
	searchQuery: '',
	editing: false,
	confirmOpen: false,
	removing: false,
};
