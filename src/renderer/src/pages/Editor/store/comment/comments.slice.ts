import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

export interface CommentState {
    comments: AppComment[];
    commentCategories: CommentCategory[];
    selectedComment: AppComment | null;
}

const initialState: CommentState = {
    comments: [],
    commentCategories: [],
    selectedComment: null,
};

const commentSlice = createSlice({
    name: 'commentState',
    initialState,
    reducers: {
        addCommentCategory(state) {
            const commentCategoryPattern = /^Category (\d+)$/;
            const matchingCommentCategories = state.commentCategories.filter(categoryComments =>
                commentCategoryPattern.test(categoryComments.name)
            );

            const sortedCommentCategories = matchingCommentCategories.sort((a, b) => {
                const aMatch = a.name.match(commentCategoryPattern);
                const bMatch = b.name.match(commentCategoryPattern);
                const aNum = aMatch ? parseInt(aMatch[1]) : 0;
                const bNum = bMatch ? parseInt(bMatch[1]) : 0;
                return aNum - bNum;
            });

            var lastSortedNumber = 1;
            if (sortedCommentCategories && sortedCommentCategories.length > 0) {
                const lastCommentCategory = sortedCommentCategories[sortedCommentCategories.length - 1];
                const number = parseInt(lastCommentCategory.name.match(/\d+/)?.[0] || '0');
                lastSortedNumber = number + 1;
            }

            state.commentCategories.push({
                id: uuidv4(),
                name: `Category ${lastSortedNumber}`
            })
        },
        updateCommentCategory(state, action: PayloadAction<CommentCategory>) {
            const category = state.commentCategories.find(category => category.id === action.payload.id)
            if (category) {
                category.name = action.payload.name
            }
        },
        editComment(state, action: PayloadAction<AppComment>) {
            const comment = state.comments.find(comment => comment.id === action.payload.id)
            if (comment) {
                comment.author = action.payload.author
                comment.description = action.payload.description
                comment.updatedAt = new Date().toISOString()
            }
        },
        editCommentContent(state, action: PayloadAction<{ commentId: string, content: string }>) {
            const comment = state.comments.find(comment => comment.id === action.payload.commentId)
            if (comment) {
                comment.content = action.payload.content
            }
        },
        moveCommentToCategoryId(state, action: PayloadAction<{ comment: AppComment, categoryId?: string }>) {
            const comment = state.comments.find(comment => comment.id === action.payload.comment.id)
            if (comment) {
                comment.categoryId = action.payload.categoryId
            }
        },
        deleteCommentCategory(state, action: PayloadAction<CommentCategory>) {
            state.commentCategories = state.commentCategories.filter(category => category.id !== action.payload.id)
            state.comments = state.comments.filter(comment => comment.categoryId !== action.payload.id)
        },
        moveCommentsFromCategory(state, action: PayloadAction<{ categoryId: string, newCategoryId: string | null }>) {
            const comments = state.comments.filter(comment => comment.categoryId === action.payload.categoryId)
            comments.forEach(comment => {
                comment.categoryId = action.payload.newCategoryId ?? undefined
            })
        },
        deleteComment(state, action: PayloadAction<AppComment>) {
            const comment = state.comments.find(bookmark => bookmark.id === action.payload.id);
            if (comment) {
                comment.visible = false;
            }
        },
        addComment(state, action: PayloadAction<{ id: string, content: string, target: 'MAIN_TEXT' | 'APPARATUS_TEXT', categoryId?: string, userInfo?: string }>) {
            const newComment: AppComment = {
                id: action.payload.id,
                content: action.payload.content,
                target: action.payload.target,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                author: action.payload.userInfo ?? "Unknown",
                visible: true,
            }

            if (action.payload.categoryId)
                newComment.categoryId = action.payload.categoryId

            state.selectedComment = newComment
            state.comments.push(newComment)
        },
        updateCommentList(state, action: PayloadAction<{ target: string, comments: any[] }>) {
            const target = action.payload.target
            const comments = action.payload.comments
                .reduce((b: any[], a: any) => {
                    let index = b.findIndex((arr: any) => arr.id == a.id);
                    if (index > -1) b[index].content += "" + a.content;
                    else b.push(a);
                    return b;
                }, [])

            const commentsIds = comments.map(comment => comment.id)

            // const newCommentsFromIds: any[] = []
            // comments.forEach(comment => {
            //     const currentTargetComment = state.comments
            //         .filter(comment => comment.target === target)
            //         .find(c => c.id === comment.id)

            //     if (!currentTargetComment) {
            //         newCommentsFromIds.push(comment)
            //     }
            // })

            const currentTargetComments = state.comments
                .filter(comment => comment.target === target)
                .map(comment => ({
                    ...comment,
                    visible: commentsIds.includes(comment.id)
                }))

            const otherTargetComments = state.comments.filter(comment => comment.target !== target)

            const newComments = [
                ...currentTargetComments,
                ...otherTargetComments,
            ]

            state.comments = newComments

            // DO NOT DELETE THIS CODE

            // const newCommentsFromIds = comments
            //     .filter(comment => !newComments.filter(comment => comment.target === target).some(c => c.id === comment.id))
            //     .map(data => ({
            //         ...data,
            //         id: data.id,
            //         content: data.content ?? "",
            //         target: target,
            //         createdAt: new Date().toISOString(),
            //         updatedAt: new Date().toISOString(),
            //         author: "Unknown",
            //         visible: true,
            //     })).reduce((b, a) => {
            //         let index = b.findIndex(arr => arr.id == a.id);
            //         if (index > -1) b[index].content += " " + a.content;
            //         else b.push(a);
            //         return b;
            //     }, [])


            // state.comments = [
            //     ...newComments,
            //     ...newCommentsFromIds,
            // ]
        },
        setComments(state, action: PayloadAction<AppComment[]>) {
            state.comments = action.payload ?? []
            state.comments = state.comments.filter(comment => comment.visible);
        },
        setCommentsCategories(state, action: PayloadAction<CommentCategory[]>) {
            state.commentCategories = action.payload ?? []
        },
        selectComment(state, action: PayloadAction<AppComment | null>) {
            state.selectedComment = action.payload
        },
        selectCommentWithId(state, action: PayloadAction<string | null>) {
            state.selectedComment = null

            if (!action.payload) return

            state.selectedComment = state.comments.find(comment => comment.id === action.payload) ?? null
        },
        clearComments(state) {
            state.comments = []
        },
        clearCommentCategories(state) {
            state.commentCategories = []
        },
    },
});

export const {
    addCommentCategory,
    updateCommentCategory,
    editComment,
    editCommentContent,
    moveCommentToCategoryId,
    deleteCommentCategory,
    moveCommentsFromCategory,
    deleteComment,
    addComment,
    updateCommentList,
    setComments,
    setCommentsCategories,
    selectComment,
    selectCommentWithId,
    clearComments,
    clearCommentCategories,
} = commentSlice.actions;

export default commentSlice.reducer;