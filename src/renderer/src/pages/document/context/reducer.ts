import type { DocumentState } from './state';
import type { DocumentAction } from './actions';

export function documentReducer(state: DocumentState, action: DocumentAction): DocumentState {
	switch (action.type) {
		case 'LOAD_STARTED':
			return {
				...state,
				loaded: false,
				title: '',
				content: '',
				selection: null,
				metadata: null,
				images: [],
			};

		case 'LOAD_SUCCEEDED':
			return {
				...state,
				loaded: true,
				title: action.title,
				content: action.content ?? state.content,
				metadata: action.metadata,
			};

		case 'LOAD_FAILED':
			return { ...state, loaded: true };

		case 'TITLE_CHANGED':
			return { ...state, title: action.value };

		case 'CONTENT_CHANGED':
			return { ...state, content: action.value };

		case 'EDITOR_SELECTION_CHANGED':
			return { ...state, selection: action.selection };

		case 'METADATA_UPDATED':
			return { ...state, metadata: action.metadata };

		case 'IMAGES_UPDATED':
			return { ...state, images: action.images };

		case 'TRASH_STARTED':
			return { ...state, isTrashing: true };

		case 'TRASH_FAILED':
			return { ...state, isTrashing: false };

		case 'SIDEBAR_TOGGLED': {
			const nextSidebar = !state.sidebarOpen;
			return {
				...state,
				sidebarOpen: nextSidebar,
				agenticSidebarOpen: nextSidebar ? false : state.agenticSidebarOpen,
			};
		}

		case 'AGENTIC_SIDEBAR_TOGGLED': {
			const nextAgentic = !state.agenticSidebarOpen;
			return {
				...state,
				agenticSidebarOpen: nextAgentic,
				sidebarOpen: nextAgentic ? false : state.sidebarOpen,
			};
		}

		default: {
			const _exhaustive: never = action;
			return _exhaustive;
		}
	}
}
