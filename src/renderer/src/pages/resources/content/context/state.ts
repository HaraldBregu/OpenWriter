import type { FolderEntry } from '../../../../../../shared/types';

export interface ContentState {
	folders: FolderEntry[];
	isLoading: boolean;
	uploading: boolean;
	searchQuery: string;
	editing: boolean;
	confirmOpen: boolean;
	removing: boolean;
}

export const initialState: ContentState = {
	folders: [],
	isLoading: true,
	uploading: false,
	searchQuery: '',
	editing: false,
	confirmOpen: false,
	removing: false,
};
