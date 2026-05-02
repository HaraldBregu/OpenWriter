export function assistantReducer(state, action) {
    switch (action.type) {
        case 'INPUT_CHANGED':
            return { ...state, input: action.value };
        case 'MESSAGE_APPENDED':
            return { ...state, messages: [...state.messages, action.message] };
        case 'RUN_STARTED':
            return { ...state, isRunning: true };
        case 'RUN_FINISHED':
            return { ...state, isRunning: false };
        case 'CLEARED':
            return { ...state, messages: [], input: '' };
        default: {
            const _exhaustive = action;
            return _exhaustive;
        }
    }
}
