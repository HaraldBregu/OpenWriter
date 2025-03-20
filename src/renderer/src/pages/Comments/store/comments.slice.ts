import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

export interface CommentState {
    id: string;
    title: string;
    selectedText: string;
    comment: string;
}

export interface CategoryState {
    id: string;
    name: string;
    comments: CommentState[];
}

interface CommentCategoriesState {
    data: CategoryState[];
    isLoading: boolean;
    selectedAnnotation: string | null;
}

const initialState: CommentCategoriesState = {
    data: [],
    isLoading: false,
    selectedAnnotation: null,
};

const commentSlice = createSlice({
    name: 'comments',
    initialState,
    reducers: {
        setCategoriesData(state, action: PayloadAction<CategoryState[]>) {
            state.data = action.payload
        },
        addCategory(state, action: PayloadAction<{ id?: string; name: string }>) {
            const { id, name } = action.payload;
            const categoryName = name;
            const categoryId = id || uuidv4();
            const categoryExists = state.data.some(category => category.name === categoryName);

            if (!categoryExists) {
                state.data.push({
                    id: categoryId,
                    name: categoryName,
                    comments: []
                });
            }
        },
        updateCategoryTitle: (state, action: PayloadAction<{ categoryId: string; title: string }>) => {
            const { categoryId, title } = action.payload;
            const category = state.data.find(cat => cat.id === categoryId);
            if (category) {
                category.name = title;
            }
        },
        deleteCategory: (state, action: PayloadAction<{ categoryId: string }>) => {
            const { categoryId } = action.payload;
            state.data = state.data.filter(category => category.id !== categoryId);
        },
        addComment: (state, action: PayloadAction<{
            categoryId: string,
            comment: Partial<CommentState>
        }>) => {
            const { categoryId, comment } = action.payload;
            const categoryIndex = state.data.findIndex(category => category.id === categoryId);

            if (categoryIndex !== -1) {
                const commentId = comment.id || uuidv4();

                state.data[categoryIndex].comments.push({
                    id: commentId,
                    title: comment.title || 'New Comment',
                    selectedText: comment.selectedText || '',
                    comment: comment.comment || ''
                });
            }
        },
        updateCommentTitle: (state, action: PayloadAction<{
            categoryId: string,
            commentId: string,
            title: string
        }>) => {
            const { categoryId, commentId, title } = action.payload;
            const category = state.data.find(cat => cat.id === categoryId);

            if (category) {
                const comment = category.comments.find(c => c.id === commentId);
                if (comment) {
                    comment.title = title;
                }
            }
        },
        updateCommentContent: (state, action: PayloadAction<{
            categoryId: string,
            commentId: string,
            content: string
        }>) => {
            const { categoryId, commentId, content } = action.payload;
            const category = state.data.find(cat => cat.id === categoryId);

            if (category) {
                const comment = category.comments.find(c => c.id === commentId);
                if (comment) {
                    comment.comment = content;
                }
            }
        },
        updateComment: (state, action: PayloadAction<{
            categoryId: string,
            commentId: string,
            updates: Partial<CommentState>
        }>) => {
            const { categoryId, commentId, updates } = action.payload;
            const category = state.data.find(cat => cat.id === categoryId);

            if (category) {
                const commentIndex = category.comments.findIndex(c => c.id === commentId);
                if (commentIndex !== -1) {
                    category.comments[commentIndex] = {
                        ...category.comments[commentIndex],
                        ...updates
                    };
                }
            }
        },
        deleteComment: (state, action: PayloadAction<{
            categoryId: string,
            commentId: string
        }>) => {
            const { categoryId, commentId } = action.payload;
            const category = state.data.find(cat => cat.id === categoryId);

            if (category) {
                category.comments = category.comments.filter(comment => comment.id !== commentId);
            }
        },
        selectAnnotation: (state, action: PayloadAction<{ text: string }>) => {
            state.selectedAnnotation = action.payload.text;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        }
    },
});

export const {
    setCategoriesData,
    addCategory,
    updateCategoryTitle,
    deleteCategory,
    addComment,
    updateComment,
    updateCommentTitle,
    updateCommentContent,
    deleteComment,
    selectAnnotation,
    setLoading
} = commentSlice.actions;

export default commentSlice.reducer;