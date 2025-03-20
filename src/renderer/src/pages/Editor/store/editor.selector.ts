import { RootState } from "src/renderer/src/store/store";

export const selectEditorData = (state: RootState) => state.editor.data;
export const selectEditorLoading = (state: RootState) => state.editor.isLoading;