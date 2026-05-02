export function editorReducer(state, action) {
    switch (action.type) {
        case 'SET_IMAGE_DIALOG_OPEN':
            return { ...state, imageDialogOpen: action.payload };
    }
}
