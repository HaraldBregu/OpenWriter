import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "src/renderer/src/store/store";

const commentState = (state: RootState) => state.commentState

export const commentsSelector = createSelector(
  commentState,
  (state) => state.comments
)

export const visibleCommentsSelector = createSelector(
  commentsSelector,
  (comments) => comments.filter(comment => comment.visible)
)

export const commentCategoriesSelector = createSelector(
  commentState,
  (state) => state.commentCategories
)

export const commentCategoryOptionsSelector = createSelector(
  commentState,
  (state) => state.commentCategories.map((category) => ({
    label: category.name,
    value: category.id,
  } as BubbleToolbarItemOption))
)


export const selectedCommentSelector = createSelector(
  commentState,
  (state) => state.selectedComment
)

