import { RootState } from "src/renderer/src/store/store";


export const getAllCategories = (state: RootState) => state.comments.data;
