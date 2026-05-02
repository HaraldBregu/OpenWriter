export function contentReducer(state, action) {
    switch (action.type) {
        case 'SET_CONTENTS':
            return { ...state, contents: action.payload };
        case 'SET_IS_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_UPLOADING':
            return { ...state, uploading: action.payload };
        case 'SET_SEARCH_QUERY':
            return { ...state, searchQuery: action.payload };
        case 'SET_EDITING':
            return { ...state, editing: action.payload };
        case 'SET_CONFIRM_OPEN':
            return { ...state, confirmOpen: action.payload };
        case 'SET_REMOVING':
            return { ...state, removing: action.payload };
    }
}
