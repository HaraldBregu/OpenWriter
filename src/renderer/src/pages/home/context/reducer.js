export function homeReducer(state, action) {
    switch (action.type) {
        case 'SET_GREETING':
            return { ...state, greeting: action.value };
        default:
            return state;
    }
}
