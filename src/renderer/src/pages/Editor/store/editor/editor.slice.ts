import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import colors from "tailwindColors.json"
import { v4 as uuidv4 } from 'uuid';

export const initialTocSettings: TocSettings = {
    show: false,
    levels: 3,
    indentLevels: true,
    title: "Table of Contents",
    tabLeaderFormat: "1",
    showHeadingNumbers: true,
    numberSeparator: "2",
    level1Format: "1",
    level2Format: "1",
    level3Format: "1",
    level4Format: "1",
    level5Format: "1",
    level6Format: "1",
}

const initialEmphasisState: EmphasisState = {
    headingLevel: 0,
    fontFamily: "Times New Roman",
    fontSize: "12pt",
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    alignment: 'left',
    blockquote: false,
    isCodeBlock: false,
    bulletStyle: {
        type: '',
        style: '',
        previousType: '',
    },
    highlight: "#ffffff",
    textColor: colors.primary[20],
    superscript: false,
    subscript: false,
    spacing: {
        before: null,
        after: null,
        line: 1,
    },
    showNonPrintingCharacters: false
}

export interface EditorState {
    data: string[];
    toolbarEmphasisState: EmphasisState;
    editorMode: 'editing' | 'review';
    canEdit: boolean;
    canUndo: boolean;
    canRedo: boolean;
    headingEnabled: boolean;
    isBlockquote: boolean;
    alignment: string;
    mode: string;
    isNonPrintingCharacter: boolean;
    canAddBookmark: boolean;
    canAddComment: boolean;
    tocSettings: TocSettings;
    history?: HistoryState;
    changeIndent: 'increase' | 'decrease' | null;
    bookmarkActive: boolean;
    commentActive: boolean;
    tocStructure: TreeItem[];
    bookmarkHighlighted: boolean;
    commentHighlighted: boolean;
    apparatuses: Apparatus[];
    printPreviewVisible: boolean;
    documentTemplate: any
}

const initialState: EditorState = {
    data: [],
    toolbarEmphasisState: initialEmphasisState,
    editorMode: 'editing',
    canEdit: true,
    headingEnabled: true,
    canUndo: false,
    canRedo: false,
    isBlockquote: false,
    alignment: 'left',
    mode: 'editing',
    isNonPrintingCharacter: false,
    canAddBookmark: true,
    canAddComment: true,
    tocSettings: initialTocSettings,
    changeIndent: null,
    bookmarkActive: false,
    commentActive: false,
    tocStructure: [],
    bookmarkHighlighted: true,
    commentHighlighted: true,
    apparatuses: [
        {
            id: uuidv4(),
            title: "Apparatus 1",
            type: "CRITICAL",
            visible: true,
        },
    ],
    printPreviewVisible: false,
    documentTemplate: null
};

const editorSlice = createSlice({
    name: 'editor',
    initialState,
    reducers: {
        setEmphasisState(state, action: PayloadAction<EmphasisState>) {
            const emphasisState = action.payload;
            state.toolbarEmphasisState = {
                ...emphasisState,
            };
        },
        setCanUndo(state, action: PayloadAction<boolean>) {
            state.canUndo = action.payload;
        },
        setCanRedo(state, action: PayloadAction<boolean>) {
            state.canRedo = action.payload;
        },
        setEditorMode(state, action: PayloadAction<'editing' | 'review'>) {
            state.editorMode = action.payload;
            state.canEdit = action.payload === 'editing';
        },
        updateTocSettings(state, action: PayloadAction<TocSettings>) {
            state.tocSettings = { ...state.tocSettings, ...action.payload };
        },
        clearTocSettings(state) {
            state.tocSettings = initialTocSettings;
        },
        toggleTocVisibility(state) {
            state.tocSettings.show = !state.tocSettings.show;
        },
        setHistory(state, action: PayloadAction<HistoryState>) {
            state.history = action.payload;
        },
        setCanAddBookmark(state, action: PayloadAction<boolean>) {
            state.canAddBookmark = action.payload;
        },
        setCanAddComment(state, action: PayloadAction<boolean>) {
            state.canAddComment = action.payload;
        },
        changeIndentention(state, action: PayloadAction<'increase' | 'decrease' | null>) {
            state.changeIndent = action.payload;
        },
        setBookmark(state, action: PayloadAction<boolean>) {
            state.bookmarkActive = action.payload;
        },
        setComment(state, action: PayloadAction<boolean>) {
            state.commentActive = action.payload;
        },
        toggleBookmark(state) {
            state.bookmarkActive = !state.bookmarkActive;
        },
        setTocStructure(state, action: PayloadAction<TreeItem[]>) {
            state.tocStructure = action.payload;
        },
        setHeadingEnabled(state, action: PayloadAction<boolean>) {
            state.headingEnabled = action.payload;
        },
        setBookmarkHighlighted(state, action: PayloadAction<boolean>) {
            state.bookmarkHighlighted = action.payload;
        },
        toggleBookmarkHighlighted(state) {
            state.bookmarkHighlighted = !state.bookmarkHighlighted;
        },
        setCommentHighlighted(state, action: PayloadAction<boolean>) {
            state.commentHighlighted = action.payload;
        },
        toggleCommentHighlighted(state) {
            state.commentHighlighted = !state.commentHighlighted;
        },
        updateApparatuses(state, action: PayloadAction<Apparatus[]>) {
            state.apparatuses = action.payload;
        },
        updateVisibleApparatuses(state, action: PayloadAction<Apparatus[]>) {
            const invisibleApparatuses = state.apparatuses.filter(apparatus => !apparatus.visible);
            state.apparatuses = [
                ...invisibleApparatuses,
                ...action.payload
            ]
        },
        addApparatus(state, action: PayloadAction<ApparatusType>) {
            state.apparatuses.push({
                id: uuidv4(),
                title: "Apparatus " + (state.apparatuses.length + 1),
                type: action.payload,
                visible: true,
            });
        },
        toggleVisibilityApparatus(state, action: PayloadAction<{ id: string, visible: boolean }>) {
            const apparatuses = state.apparatuses
            const apparatus = apparatuses.find(apparatus => apparatus.id === action.payload.id);
            if (apparatus) {
                apparatus.visible = action.payload.visible;
            }
            state.apparatuses = apparatuses
        },
        createApparatusesFromDocument(state, action: PayloadAction<DocumentApparatus[]>) {
            const apparatusesData = action.payload
            if (apparatusesData.length === 0) return
            state.apparatuses = apparatusesData.map((apparatus) => ({
                id: uuidv4(),
                title: apparatus.title,
                type: apparatus.type,
                visible: apparatus.visible ?? true,
            }));
        },
        createApparatusesFromLayout(state, action: PayloadAction<any[]>) {
            const apparatusesData = action.payload
            if (apparatusesData === undefined) return
            state.apparatuses = apparatusesData.map((apparatus) => ({
                id: apparatus.id,
                title: apparatus.title,
                type: apparatus.type,
                visible: apparatus.visible ?? true,
            }));
        },
        addApparatusAfterIndex(state, action: PayloadAction<{ type: ApparatusType, index: number }>) {
            state.apparatuses.splice(action.payload.index + 1, 0, {
                id: uuidv4(),
                title: "Apparatus " + (state.apparatuses.length + 1),
                type: action.payload.type,
                visible: true,
            });
        },
        addApparatusAtTop(state, action: PayloadAction<ApparatusType>) {
            state.apparatuses.unshift({
                id: uuidv4(),
                title: "Apparatus " + (state.apparatuses.length + 1),
                type: action.payload,
                visible: true,
            });
        },
        removeApparatus(state, action: PayloadAction<Apparatus>) {
            state.apparatuses = state.apparatuses.filter(apparatus => apparatus.id !== action.payload.id);
        },
        changeApparatusType(state, action: PayloadAction<{ id: string, type: Apparatus['type'] }>) {
            const apparatus = state.apparatuses.find(apparatus => apparatus.id === action.payload.id);
            if (apparatus) {
                apparatus.type = action.payload.type;
            }
        },
        changeApparatusTitle(state, action: PayloadAction<{ id: string, title: string }>) {
            const apparatus = state.apparatuses.find(apparatus => apparatus.id === action.payload.id);
            if (apparatus) {
                apparatus.title = action.payload.title;
            }
        },
        setPrintPreviewVisible(state, action: PayloadAction<boolean>) {
            state.printPreviewVisible = action.payload;
        },
        togglePrintPreviewVisible(state) {
            state.printPreviewVisible = !state.printPreviewVisible;
        },
        setDocumentTemplate(state, action: PayloadAction<any>) {
            state.documentTemplate = action.payload;
        },
    },

});

export const {
    setEmphasisState,
    setCanUndo,
    setCanRedo,
    updateTocSettings,
    toggleTocVisibility,
    setEditorMode,
    setHistory,
    setCanAddBookmark,
    clearTocSettings,
    changeIndentention,
    setBookmark,
    toggleBookmark,
    setTocStructure,
    setHeadingEnabled,
    setBookmarkHighlighted,
    toggleBookmarkHighlighted,
    setCommentHighlighted,
    toggleCommentHighlighted,
    setCanAddComment,
    setComment,
    updateApparatuses,
    updateVisibleApparatuses,
    addApparatus,
    toggleVisibilityApparatus,
    createApparatusesFromDocument,
    createApparatusesFromLayout,
    addApparatusAfterIndex,
    addApparatusAtTop,
    removeApparatus,
    changeApparatusType,
    changeApparatusTitle,
    setPrintPreviewVisible,
    togglePrintPreviewVisible,
    setDocumentTemplate
} = editorSlice.actions;

export default editorSlice.reducer;
