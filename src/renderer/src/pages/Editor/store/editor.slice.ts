import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface EditorState {
    data: string[];
    isLoading: boolean;
}

const initialState: EditorState = {
    data: [],
    isLoading: false,
};

const editorSlice = createSlice({
    name: 'editor',
    initialState,
    reducers: {
        fetchDataStart(state) {
            state.isLoading = true;
        },
        fetchDataSuccess(state, action: PayloadAction<string[]>) {
            state.data = action.payload;
            state.isLoading = false;
        },
        fetchDataFailure(state) {
            state.isLoading = false;
        },
    },
});

export const { fetchDataStart, fetchDataSuccess, fetchDataFailure } = editorSlice.actions;

export default editorSlice.reducer;
