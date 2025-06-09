import { TreeItem } from '@/lib/tocTreeMapper';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import colors from "tailwindColors.json"
import { HistoryState } from '../../hooks';
import { v4 as uuidv4 } from 'uuid';


export interface TocSettings {
    show: boolean;
    levels: number;
    indentLevels: boolean;
    title: string;
    tabLeaderFormat: string;
    showHeadingNumbers: boolean;
    numberSeparator: string;
    level1Format?: string;
    level2Format?: string;
    level3Format?: string;
    level4Format?: string;
    level5Format?: string;
    level6Format?: string;
}

export const initialTocSettings: TocSettings = {
    show: true,
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
    sidebarOpen: boolean;
    data: string[];
    toolbarEmphasisState: EmphasisState;
    editorEmphasisState: EmphasisState;
    emphasisState: EmphasisState;
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
    selectedSidebarTabIndex: number;
    changeIndent: 'increase' | 'decrease' | null;
    bookmarkActive: boolean;
    commentActive: boolean;
    tocStructure: TreeItem[];
    bookmarkHighlighted: boolean;
    commentHighlighted: boolean;
    apparatuses: Apparatus[];
    characters: number;
    words: number;
    printPreviewVisible: boolean;
}

const initialState: EditorState = {
    sidebarOpen: false,
    data: [],
    toolbarEmphasisState: initialEmphasisState,
    editorEmphasisState: initialEmphasisState,
    emphasisState: initialEmphasisState,
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
    selectedSidebarTabIndex: 0,
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
            disabled: false,
        },
    ],
    characters: 0,
    words: 0,
    printPreviewVisible: false,
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
            state.emphasisState = emphasisState;
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
        setHistory(state, action: PayloadAction<HistoryState>) {
            state.history = action.payload;
        },
        setCanAddBookmark(state, action: PayloadAction<boolean>) {
            state.canAddBookmark = action.payload;
        },
        setCanAddComment(state, action: PayloadAction<boolean>) {
            state.canAddComment = action.payload;
        },
        setSelectedSidebarTabIndex(state, action: PayloadAction<number>) {
            state.selectedSidebarTabIndex = action.payload;
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
        addApparatus(state, action: PayloadAction<ApparatusType>) {
            state.apparatuses.push({
                id: uuidv4(),
                title: "Apparatus " + (state.apparatuses.length + 1),
                type: action.payload,
                visible: true,
                disabled: false
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
        createApparatusesFromDocument(state, action: PayloadAction<any[]>) {
            const apparatusesData = action.payload
            if (apparatusesData === undefined) return
            state.apparatuses = apparatusesData.map((apparatus) => ({
                id: uuidv4(),
                title: apparatus.title,
                type: apparatus.type,
                visible: apparatus.visible ?? true,
                disabled: apparatus.disabled
            }));
        },
        createApparatusesFromLayout(state, action: PayloadAction<any[]>) {
            const apparatusesData = action.payload
            if (apparatusesData === undefined) return


            apparatusesData.forEach((apparatus) => {
                console.log("apparatusesData", apparatus)

            });

            state.apparatuses = apparatusesData.map((apparatus) => ({
                id: apparatus.id,
                title: apparatus.title,
                type: apparatus.type,
                visible: apparatus.visible ?? true,
                disabled: apparatus.disabled
            }));
        },
        addApparatusAfterIndex(state, action: PayloadAction<{ type: ApparatusType, index: number }>) {
            state.apparatuses.splice(action.payload.index + 1, 0, {
                id: uuidv4(),
                title: "Apparatus " + (state.apparatuses.length + 1),
                type: action.payload.type,
                visible: true,
                disabled: false
            });
        },
        addApparatusAtTop(state, action: PayloadAction<ApparatusType>) {
            state.apparatuses.unshift({
                id: uuidv4(),
                title: "Apparatus " + (state.apparatuses.length + 1),
                type: action.payload,
                visible: true,
                disabled: false
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
        setCharacters(state, action: PayloadAction<number>) {
            state.characters = action.payload;
        },
        setWords(state, action: PayloadAction<number>) {
            state.words = action.payload;
        },
        setPrintPreviewVisible(state, action: PayloadAction<boolean>) {
            state.printPreviewVisible = action.payload;
        },
        togglePrintPreviewVisible(state) {
            state.printPreviewVisible = !state.printPreviewVisible;
        },
        setSidebarOpen: (state, action: PayloadAction<boolean>) => {
            state.sidebarOpen = action.payload;
        },
        toggleSidebar: (state) => {
            state.sidebarOpen = !state.sidebarOpen;
        },
    },

});

export const {
    setEmphasisState,
    setCanUndo,
    setCanRedo,
    updateTocSettings,
    setEditorMode,
    setHistory,
    setCanAddBookmark,
    clearTocSettings,
    setSelectedSidebarTabIndex,
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
    addApparatus,
    toggleVisibilityApparatus,
    createApparatusesFromDocument,
    createApparatusesFromLayout,
    addApparatusAfterIndex,
    addApparatusAtTop,
    removeApparatus,
    changeApparatusType,
    changeApparatusTitle,
    setCharacters,
    setWords,
    setPrintPreviewVisible,
    togglePrintPreviewVisible,
    setSidebarOpen,
    toggleSidebar,
} = editorSlice.actions;

export default editorSlice.reducer;
