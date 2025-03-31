import { RootState } from "src/renderer/src/store/store";
import colors from "tailwindColors.json"

export const selectEditorData = (state: RootState) => state.editor.data;
export const selectEditorLoading = (state: RootState) => state.editor.isLoading;

export const selectIsBold = (state: RootState) => {
  if (!state.editor) return false;
  return state.editor.isBold || false;
};

export const selectIsItalic = (state: RootState) => {
  if (!state.editor) return false;
  return state.editor.isItalic || false;
};

export const selectIsUnderline = (state: RootState) => {
  if (!state.editor) return false;
  return state.editor.isUnderline || false;
};

export const selectIsHeading = (state: RootState) => {
  if (!state.editor) return false;
  return state.editor.isHeading || false;
};

export const selectHeadingLevel = (state: RootState) => {
  if (!state.editor) return 0;
  return state.editor.headingLevel;
};

export const selectRedo = (state: RootState) => {
  return state.editor.redo;
};

export const selectFontFamily = (state: RootState) => {
  if (!state.editor) return "Default";
  return state.editor.fontFamily;
};

export const selectFontSize = (state: RootState) => {
  if (!state.editor) return 12;
  return state.editor.fontSize;
};

export const selectTextColor = (state: RootState) => {
  if (!state.editor) return colors.primary[20];
  return state.editor.textColor;
};

export const selectHighlightColor = (state: RootState) => {
  if (!state.editor) return colors.primary[20];
  return state.editor.highlightColor;
};

export const selectComment = (state: RootState) => {
  if (!state.editor) return false;
  return state.editor.comment;
};

export const selectBookmark = (state: RootState) => {
  if (!state.editor) return false;
  return state.editor.bookmark;
};

export const selectBookmarksCategories = (state: RootState) => {
  if (!state.editor) return [];
  return state.editor.bookmarkCategories ?? [];
};

export const selectBookmarks = (state: RootState) => {
  if (!state.editor) return [];
  return state.editor.bookmarks;
};

