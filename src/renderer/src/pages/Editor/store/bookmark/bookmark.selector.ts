import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "src/renderer/src/store/store";

const bookmarkState = (state: RootState) => state.bookmarkState

export const bookmarksSelector = createSelector(
  bookmarkState,
  (state) => state.bookmarks
)

export const visibleBookmarksSelector = createSelector(
  bookmarksSelector,
  (bookmarks) => bookmarks.filter(bookmark => bookmark.visible)
)

export const bookmarkCategoriesSelector = createSelector(
  bookmarkState,
  (state) => state.bookmarkCategories
)

export const selectedBookmarkSelector = createSelector(
  bookmarkState,
  (state) => state.selectedBookmark
)
