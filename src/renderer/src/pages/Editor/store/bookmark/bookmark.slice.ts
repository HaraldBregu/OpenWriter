import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

export interface BookmarkState {
    bookmarks: Bookmark[];
    bookmarkCategories: BookmarkCategory[];
    selectedBookmark: Bookmark | null;
}

const initialState: BookmarkState = {
    bookmarks: [],
    bookmarkCategories: [],
    selectedBookmark: null,
};

const bookmarkSlice = createSlice({
    name: 'bookmarkState',
    initialState,
    reducers: {
        addBookmark(state, action: PayloadAction<{ id: string, baseTitle: string, content: string, categoryId?: string, userInfo?: string }>) {

            /*const bookmarkPattern = /^Bookmark (\d+)$/;
            const matchingBookmarks = state.bookmarks.filter(bookmark =>
                bookmarkPattern.test(bookmark.title)
            );

            const sortedBookmarks = matchingBookmarks
                .filter(bookmark => bookmark.visible)
                .sort((a, b) => {
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
            }*/

            const sortedBookmarks = state.bookmarks
                .filter(bookmark => bookmark.visible).length ?? 0

            const lastSortedNumber = sortedBookmarks + 1;

            const newBookmark: Bookmark = {
                id: action.payload.id,
                content: action.payload.content,
                title: `${action.payload.baseTitle} ${lastSortedNumber}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                author: action.payload.userInfo ?? "Unknown",
                visible: true,
            }

            if (action.payload.categoryId)
                newBookmark.categoryId = action.payload.categoryId

            state.selectedBookmark = newBookmark
            state.bookmarks.push(newBookmark)
        },
        editBookmark(state, action: PayloadAction<Bookmark>) {
            const bookmark = state.bookmarks.find(bookmark => bookmark.id === action.payload.id)
            if (bookmark) {
                bookmark.author = action.payload.author
                bookmark.title = action.payload.title
                bookmark.description = action.payload.description
                bookmark.updatedAt = new Date().toISOString()
            }
        },
        editBookmarkContent(state, action: PayloadAction<{ bookmarkId: string, content: string }>) {
            const bookmark = state.bookmarks.find(bookmark => bookmark.id === action.payload.bookmarkId)
            if (bookmark) {
                bookmark.content = action.payload.content
            }
        },
        updateBookmarkList(state, action: PayloadAction<any[]>) {
            const bookmarks = action.payload
                .reduce((b: any[], a: any) => {
                    let index = b.findIndex((arr: any) => arr.id == a.id);
                    if (index > -1) b[index].content += " " + a.content;
                    else b.push(a);
                    return b;
                }, [])

            const bookmarkIds = bookmarks.map(bookmark => bookmark.id)

            state.bookmarks = state.bookmarks.map(bookmark => ({
                ...bookmark,
                visible: bookmarkIds.includes(bookmark.id)
            }));

        },
        moveBookmarkToCategoryId(state, action: PayloadAction<{ bookmark: Bookmark, categoryId?: string }>) {
            const bookmark = state.bookmarks.find(bookmark => bookmark.id === action.payload.bookmark.id)
            if (bookmark) {
                bookmark.categoryId = action.payload.categoryId
            }
        },
        deleteBookmark(state, action: PayloadAction<Bookmark>) {
            const bookmark = state.bookmarks.find(bookmark => bookmark.id === action.payload.id);
            if (bookmark) {
                bookmark.visible = false;
            }
        },
        addBookmarkCategory(state) {
            const bookmarkCategoryPattern = /^Category (\d+)$/;
            const matchingBookmarkCategories = state.bookmarkCategories.filter(categoryBookmarks =>
                bookmarkCategoryPattern.test(categoryBookmarks.name)
            );

            const sortedBookmarkCategories = matchingBookmarkCategories.sort((a, b) => {
                const aMatch = a.name.match(bookmarkCategoryPattern);
                const bMatch = b.name.match(bookmarkCategoryPattern);
                const aNum = aMatch ? parseInt(aMatch[1]) : 0;
                const bNum = bMatch ? parseInt(bMatch[1]) : 0;
                return aNum - bNum;
            });

            var lastSortedNumber = 1;
            if (sortedBookmarkCategories && sortedBookmarkCategories.length > 0) {
                const lastBookmarkCategory = sortedBookmarkCategories[sortedBookmarkCategories.length - 1];
                const number = parseInt(lastBookmarkCategory.name.match(/\d+/)?.[0] || '0');
                lastSortedNumber = number + 1;
            }

            state.bookmarkCategories.push({
                id: uuidv4(),
                name: `Category ${lastSortedNumber}`
            })
        },
        deleteBookmarkCategory(state, action: PayloadAction<BookmarkCategory>) {
            state.bookmarkCategories = state.bookmarkCategories.filter(category => category.id !== action.payload.id)
            state.bookmarks = state.bookmarks.filter(bookmark => bookmark.categoryId !== action.payload.id)
        },
        updateBookmarkCategory(state, action: PayloadAction<BookmarkCategory>) {
            const category = state.bookmarkCategories.find(category => category.id === action.payload.id)
            if (category) {
                category.name = action.payload.name
            }
        },
        moveBookmarksFromCategory(state, action: PayloadAction<{ categoryId: string, newCategoryId: string | null }>) {
            const bookmarks = state.bookmarks.filter(bookmark => bookmark.categoryId === action.payload.categoryId)
            bookmarks.forEach(bookmark => {
                bookmark.categoryId = action.payload.newCategoryId ?? undefined
            })
        },
        setBookmarks(state, action: PayloadAction<Bookmark[]>) {
            state.bookmarks = action.payload ?? []
            state.bookmarks = state.bookmarks.filter(bookmark => bookmark.visible);
        },
        setBookmarksCategories(state, action: PayloadAction<BookmarkCategory[]>) {
            state.bookmarkCategories = action.payload ?? []
        },
        clearBookmarks(state) {
            state.bookmarks = []
        },
        clearBookmarksCategories(state) {
            state.bookmarkCategories = []
        },
        selectBookmark(state, action: PayloadAction<Bookmark | null>) {
            state.selectedBookmark = action.payload
        },
        selectBookmarkWithId(state, action: PayloadAction<string | null>) {
            state.selectedBookmark = null

            if (!action.payload) return

            state.selectedBookmark = state.bookmarks.find(bookmark => bookmark.id === action.payload) ?? null
        }
    },
});

export const {
    addBookmark,
    editBookmark,
    editBookmarkContent,
    deleteBookmark,
    moveBookmarkToCategoryId,
    addBookmarkCategory,
    deleteBookmarkCategory,
    updateBookmarkCategory,
    moveBookmarksFromCategory,
    setBookmarks,
    setBookmarksCategories,
    clearBookmarks,
    clearBookmarksCategories,
    updateBookmarkList,
    selectBookmark,
    selectBookmarkWithId,
} = bookmarkSlice.actions;

export default bookmarkSlice.reducer;
