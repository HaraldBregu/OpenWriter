export function contentGeneratorReducer(state, action) {
    switch (action.type) {
        case 'SET_PROMPT':
            return { ...state, prompt: action.payload };
        case 'ADD_FILE':
            return { ...state, files: [...state.files, action.payload] };
        case 'ADD_PREVIEW_URL':
            return { ...state, previewUrls: [...state.previewUrls, action.payload] };
        case 'REMOVE_FILE':
            return {
                ...state,
                files: state.files.filter((_, i) => i !== action.payload),
                previewUrls: state.previewUrls.filter((_, i) => i !== action.payload),
            };
        case 'SET_FILES':
            return { ...state, files: action.payload };
        case 'SET_DRAG_OVER':
            return { ...state, isDragOver: action.payload };
        case 'SET_IMAGE_MODEL':
            return { ...state, selectedImageModel: action.payload };
        case 'SET_TEXT_MODEL':
            return { ...state, selectedTextModel: action.payload };
        case 'SET_SELECTION':
            return { ...state, selection: action.payload };
    }
}
