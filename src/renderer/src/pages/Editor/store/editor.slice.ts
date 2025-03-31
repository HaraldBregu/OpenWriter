import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import colors from "tailwindColors.json"

interface EditorState {
    data: string[];
    isLoading: boolean;
    isBold: boolean;
    isItalic: boolean;
    isUnderline: boolean;
    isHeading: boolean;
    headingLevel: number;
    redo: boolean;
    fontFamily: string;
    fontSize: number;
    textColor: string;
    highlightColor: string;
    comment: boolean;
    bookmark: boolean;
    bookmarks: Bookmark[];
    bookmarkCategories: string[];
}

const initialState: EditorState = {
    data: [],
    isLoading: false,
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isHeading: false,
    headingLevel: 0,
    redo: false,
    fontFamily: "Default",
    fontSize: 12,
    textColor: colors.primary[20],
    highlightColor: colors.primary[20],
    comment: false,
    bookmark: false,
    bookmarks: [],
    bookmarkCategories: [],
};

const editorSlice = createSlice({
    name: 'editor',
    initialState,
    reducers: {
        fetchDataStart(state) {
            state.isLoading = true;
        },
        fetchDataSuccess(state, action: PayloadAction<string[]>) {
            state.data = action.payload;
            state.isLoading = false;
        },
        fetchDataFailure(state) {
            state.isLoading = false;
        },
        setBold(state, action: PayloadAction<boolean>) {
            state.isBold = action.payload;
        },
        toggleBold(state) {
            state.isBold = !state.isBold;
        },
        setItalic(state, action: PayloadAction<boolean>) {
            state.isItalic = action.payload;
        },
        toggleItalic(state) {
            state.isItalic = !state.isItalic;
        },
        setUnderline(state, action: PayloadAction<boolean>) {
            state.isUnderline = action.payload;
        },
        toggleUnderline(state) {
            state.isUnderline = !state.isUnderline;
        },
        setHeadingLevel(state, action: PayloadAction<number>) {
            state.headingLevel = action.payload;
            state.isHeading = action.payload > 0;
        },
        redo(state, action: PayloadAction<boolean>) {
            state.redo = action.payload;
        },
        setFontFamily(state, action: PayloadAction<string>) {
            state.fontFamily = action.payload;
        },
        setFontSize(state, action: PayloadAction<number>) {
            state.fontSize = action.payload;
        },
        increaseFontSize(state) {
            const size = state.fontSize;
            if (size > 95) return
            state.fontSize = size + 1;
        },
        decreaseFontSize(state) {
            const size = state.fontSize;
            if (size < 7) return
            state.fontSize = size - 1;
        },
        setTextColor(state, action: PayloadAction<string>) {
            state.textColor = action.payload;
        },
        setHighlightColor(state, action: PayloadAction<string>) {
            state.highlightColor = action.payload;
        },
        setComment(state, action: PayloadAction<boolean>) {
            state.comment = action.payload;
        },
        executeComment(state) {
            console.log("executeComment:", state)
        },
        setBookmark(state, action: PayloadAction<boolean>) {
            state.bookmark = action.payload;
        },
        executeBookmark(state) {
            console.log("executeBookmark:", state)
        },
        addBookmark(state, action: PayloadAction<{ id: string, content: string, category?: string }>) {
            console.log("addBookmark:", state)

            const bookmarkPattern = /^Bookmark (\d+)$/;
            const matchingBookmarks = state.bookmarks.filter(bookmark =>
                bookmarkPattern.test(bookmark.title)
            );

            const sortedBookmarks = matchingBookmarks.sort((a, b) => {
                const aMatch = a.title.match(bookmarkPattern);
                const bMatch = b.title.match(bookmarkPattern);
                const aNum = aMatch ? parseInt(aMatch[1]) : 0;
                const bNum = bMatch ? parseInt(bMatch[1]) : 0;
                return aNum - bNum;
            });

            var lastSortedNumber = 1;
            if (sortedBookmarks && sortedBookmarks.length > 0) {
                const lastBookmark = sortedBookmarks[sortedBookmarks.length - 1];
                const number = parseInt(lastBookmark.title.match(/\d+/)?.[0] || '0');
                lastSortedNumber = number + 1;
            }

            const newBookmark: Bookmark = {
                id: action.payload.id,
                content: action.payload.content,
                title: `Bookmark ${lastSortedNumber}`,
                description: "New Bookmark",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                author: "Anonymous Author",
            }

            if (action.payload.category)
                newBookmark.category = action.payload.category

            state.bookmarks.push(newBookmark)
        },
        deleteBookmark(state, action: PayloadAction<string>) {
            state.bookmarks = state.bookmarks.filter(bookmark => bookmark.id !== action.payload)
        },
        addBookmarkCategory(state) {
            console.log("addBookmarkCategory:", state)
            const bookmarkCategoryPattern = /^Category (\d+)$/;
            const matchingBookmarkCategories = state.bookmarkCategories.filter(categoryBookmarks =>
                bookmarkCategoryPattern.test(categoryBookmarks)
            );

            const sortedBookmarkCategories = matchingBookmarkCategories.sort((a, b) => {
                const aMatch = a.match(bookmarkCategoryPattern);
                const bMatch = b.match(bookmarkCategoryPattern);
                const aNum = aMatch ? parseInt(aMatch[1]) : 0;
                const bNum = bMatch ? parseInt(bMatch[1]) : 0;
                return aNum - bNum;
            });

            var lastSortedNumber = 1;
            if (sortedBookmarkCategories && sortedBookmarkCategories.length > 0) {
                const lastBookmarkCategory = sortedBookmarkCategories[sortedBookmarkCategories.length - 1];
                const number = parseInt(lastBookmarkCategory.match(/\d+/)?.[0] || '0');
                lastSortedNumber = number + 1;
            }

            state.bookmarkCategories.push(`Category ${lastSortedNumber}`)
        },
        deleteBookmarkCategory(state, action: PayloadAction<number>) {
            const categoryName = state.bookmarkCategories[action.payload];
            state.bookmarks = state.bookmarks.filter(bookmark => bookmark.category !== categoryName);
            state.bookmarkCategories.splice(action.payload, 1)
        },
    },
});

export const {
    fetchDataStart,
    fetchDataSuccess,
    fetchDataFailure,
    setBold,
    toggleBold,
    setItalic,
    toggleItalic,
    setUnderline,
    toggleUnderline,
    setHeadingLevel,
    redo,
    setFontFamily,
    setFontSize,
    increaseFontSize,
    decreaseFontSize,
    setTextColor,
    setHighlightColor,
    setComment,
    executeComment,
    setBookmark,
    executeBookmark,
    addBookmark,
    deleteBookmark,
    addBookmarkCategory,
    deleteBookmarkCategory,
} = editorSlice.actions;

export default editorSlice.reducer;
