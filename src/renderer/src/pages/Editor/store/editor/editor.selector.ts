import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "src/renderer/src/store/store";

const editorState = (state: RootState) => state.editor;

export const selectEditorData = createSelector(
  editorState,
  (editor) => editor.data
);

export const selectToolbarEmphasisState = createSelector(
  editorState,
  (editor) => editor.toolbarEmphasisState
);

export const selectApparatuses = createSelector(
  editorState,
  (editor) => editor.apparatuses
);

export const selectVisibleApparatuses = createSelector(
  editorState,
  (editor) => editor.apparatuses.filter(apparatus => apparatus.visible)
);

export const selectApparatusesTypes = createSelector(
  editorState,
  (editor) => editor.apparatuses.map(apparatus => apparatus.type)
);

export const selectPrintPreviewVisible = createSelector(
  editorState,
  (editor) => editor.printPreviewVisible
);

export const selectIsBlockquote = createSelector(
  editorState,
  (editor) => editor?.isBlockquote || false
);

export const selectAlignment = createSelector(
  editorState,
  (editor) => editor?.alignment || 'left'
);

export const selectEditorMode = createSelector(
  editorState,
  (editor) => editor?.editorMode || "editing"
);

export const selectCanEdit = createSelector(
  editorState,
  (editor) => editor?.canEdit || false
);

export const selectChangeIndent = createSelector(
  editorState,
  (editor) => editor?.changeIndent || null
);

export const selectTocSettings = createSelector(
  editorState,
  (editor) => editor.tocSettings
);

export const showTocChecked = createSelector(
  selectTocSettings,
  (tocSettings) => tocSettings?.show || false
);

export const selectHistory = createSelector(
  editorState,
  (editor) => editor?.history
);

export const selectCanUndo = createSelector(
  editorState,
  (editor) => editor?.canUndo || false
);

export const selectCanAddBookmark = createSelector(
  editorState,
  (editor) => editor?.canAddBookmark || false
);

export const selectCanAddComment = createSelector(
  editorState,
  (editor) => editor?.canAddComment || false
);

export const selectBookmarkActive = createSelector(
  editorState,
  (editor) => editor?.bookmarkActive || false
);

export const selectCommentActive = createSelector(
  editorState,
  (editor) => editor?.commentActive || false
);

export const selectTocStructure = createSelector(
  editorState,
  (editor) => editor?.tocStructure || []
);

export const selectHeadingEnabled = createSelector(
  editorState,
  (editor) => editor?.headingEnabled || false
);

export const selectBookmarkHighlighted = createSelector(
  editorState,
  (editor) => editor?.bookmarkHighlighted || false
);

export const selectCommentHighlighted = createSelector(
  editorState,
  (editor) => editor?.commentHighlighted || false
);

// APPARATUSES SELECTORS

export const selectMaxRemainingApparatusesNumber = createSelector(
  editorState,
  (editor) => {
    const maxApparatuses = 8
    return maxApparatuses - editor.apparatuses.length
  }
);

export const selectEnabledRemainingApparatusesTypes = createSelector(
  selectMaxRemainingApparatusesNumber,
  editorState,
  (remainingApparatuses, editor) => {
    if (remainingApparatuses <= 0) return []

    const apparatusTypes = [
      'CRITICAL', 
      'PAGE_NOTES', 
      'SECTION_NOTES', 
      'INNER_MARGIN',
      'OUTER_MARGIN'
    ] as const satisfies ApparatusType[]

    const types = apparatusTypes.filter(type => {
      const innerMargin = editor.apparatuses.some(apparatus => apparatus.type === 'INNER_MARGIN')
      const outerMargin = editor.apparatuses.some(apparatus => apparatus.type === 'OUTER_MARGIN')
      if (type === 'INNER_MARGIN' && innerMargin) {
        return false
      }
      if (type === 'OUTER_MARGIN' && outerMargin) {
        return false
      }

      return true
    })

    return types as ApparatusType[]
  }
);

export const selectDisabledRemainingApparatusesTypes = createSelector(
  selectMaxRemainingApparatusesNumber,
  editorState,
  (remainingApparatuses, editor) => {
    const apparatusTypes = ['CRITICAL', 'PAGE_NOTES', 'SECTION_NOTES', 'INNER_MARGIN', 'OUTER_MARGIN'];

    const types = apparatusTypes.filter(type => {
      const innerMargin = editor.apparatuses.some(apparatus => apparatus.type === 'INNER_MARGIN')
      const outerMargin = editor.apparatuses.some(apparatus => apparatus.type === 'OUTER_MARGIN')
      if (type === 'INNER_MARGIN' && innerMargin) {
        return true
      } else if (type === 'OUTER_MARGIN' && outerMargin) {
        return true
      } else if (remainingApparatuses <= 0) {
        return editor.apparatuses.filter(apparatus => apparatus.type !== 'INNER_MARGIN' && apparatus.type !== 'OUTER_MARGIN')
      }
      return false
    })

    return types
  }
);

export const selectMaxRemainingInnerMargins = createSelector(
  editorState,
  (editor) => {
    const innerMargins = editor.apparatuses.filter(apparatus => apparatus.type === 'INNER_MARGIN')
    return 1 - innerMargins.length
  }
);

export const selectDocumentTemplate = createSelector(
    [editorState],
    (editor) => editor.documentTemplate
);

