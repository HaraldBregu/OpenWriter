import { AppTab, AppTabsList } from "@/components/ui/app-tabs-list";
import { Sidebar, SidebarContent, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { ForwardedRef, forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import TableOfContents from "@/components/app-table-of-contents";
import { useDispatch, useSelector } from "react-redux";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import Button from "@/components/ui/button";
import { bookmarkCategoriesSelector, visibleBookmarksSelector, selectedBookmarkSelector } from "./store/bookmark/bookmark.selector";
import { addBookmarkCategory, deleteBookmark, deleteBookmarkCategory, editBookmark, moveBookmarksFromCategory, moveBookmarkToCategoryId, selectBookmark, updateBookmarkCategory } from "./store/bookmark/bookmark.slice";
import { selectTocSettings, selectTocStructure } from "./store/editor/editor.selector";
import { updateTocSettings } from "./store/editor/editor.slice";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import AppBookmarks from "@/components/app-bookmarks";
import AppComments from "@/components/app-comments";
import { addCommentCategory, deleteComment, deleteCommentCategory, editComment, moveCommentsFromCategory, moveCommentToCategoryId, selectComment, updateCommentCategory } from "./store/comment/comments.slice";
import { selectLayoutSettings } from "./store/layout/layout.selector";
import { commentCategoriesSelector, selectedCommentSelector, visibleCommentsSelector } from "./store/comment/comments.selector";
import { useEditor } from "./hooks/useEditor";
import { setSelectedSideviewTabIndex } from "./provider";


interface ESidebarProps {
    onClickBookmark: (bookmark: Bookmark) => void
    onClickComment: (comment: AppComment) => void
    onClickHeadingIndex: (index: number) => void
    onDeleteBookmarks: (bookmarks?: Bookmark[]) => void
    onDeleteComments: (comments?: AppComment[]) => void
}

const Sideview = forwardRef(({
    onClickBookmark,
    onClickComment,
    onClickHeadingIndex,
    onDeleteBookmarks,
    onDeleteComments,
}: ESidebarProps, ref: ForwardedRef<unknown>) => {
    useImperativeHandle(ref, () => {
        return {
            registerBookmark: (id: string, categoryId?: string) => {
                bookmarkRef.current?.createBookmark(id, categoryId)
            },
            registerComment: (id: string, categoryId?: string) => {
                commentRef.current?.createComment(id, categoryId)
            }
        }
    })

    const [state, dispatchEditor] = useEditor();
    const selectedSidebarTabIndex = useMemo(() => state.selectedSideviewTabIndex, [state.selectedSideviewTabIndex]);

    const commentRef = useRef<any>();
    const bookmarkRef = useRef<any>();

    const dispatch = useDispatch();
    const { t } = useTranslation();

    const tabs = [
        { value: "comments", label: "1" },
        { value: "bookmarks", label: "2" },
        { value: "tableOfContents", label: "3" },
    ]

    function handleTabChange(tab: AppTab) {
        const index = tabs.indexOf(tab);
        dispatchEditor(setSelectedSideviewTabIndex(index));
    }

    const tocStructure = useSelector(selectTocStructure)
    const tocSettings = useSelector(selectTocSettings);

    const bookmarks = useSelector(visibleBookmarksSelector);
    const bookmarkCategories = useSelector(bookmarkCategoriesSelector);

    const comments = useSelector(visibleCommentsSelector);
    const commentCategories = useSelector(commentCategoriesSelector);

    const {
        setupDialogState: layoutTemplate,
        sort,
    } = useSelector(selectLayoutSettings);

    const [newCategoryIdToMoveBookmarks, setNewCategoryIdToMoveBookmarks] = useState<string | null>(null);

    const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState<{
        open: boolean,
        category?: BookmarkCategory,
        bookmarks?: Bookmark[],
        categories?: BookmarkCategory[]
    }>({ open: false });
    const [moveBookmarksFromCategoryDialogOpen, setMoveBookmarksFromCategoryDialogOpen] = useState<{
        open: boolean,
        category?: BookmarkCategory,
        categories?: BookmarkCategory[]
    }>({ open: false });
    const [moveBookmarkToCategoryDialogOpen, setMoveBookmarkToCategoryDialogOpen] = useState<{
        open: boolean,
        bookmark?: Bookmark,
        categories?: BookmarkCategory[]
    }>({ open: false });

    const [deleteCommentCategoryDialogOpen, setDeleteCommentCategoryDialogOpen] = useState<{
        open: boolean,
        category?: CommentCategory,
        comments?: AppComment[],
        categories?: CommentCategory[]
    }>({ open: false });
    const [moveCommentsFromCategoryDialogOpen, setMoveCommentsFromCategoryDialogOpen] = useState<{
        open: boolean,
        category?: CommentCategory,
        categories?: CommentCategory[]
    }>({ open: false });
    const [moveCommentToCategoryDialogOpen, setMoveCommentToCategoryDialogOpen] = useState<{
        open: boolean,
        comment?: AppComment,
        categories?: CommentCategory[]
    }>({ open: false });

    const selectedComment = useSelector(selectedCommentSelector)
    const selectedBookmark = useSelector(selectedBookmarkSelector)

    return (
        <>
            <Sidebar collapsible="offcanvas" className="border-t border-grey-70 dark:border-grey-40">
                {/* Sidebar Header */}
                <SidebarHeader>
                    <AppTabsList
                        tabs={tabs}
                        selectedTab={tabs[selectedSidebarTabIndex]}
                        onTabChange={(tab) => handleTabChange(tab)}
                    />
                </SidebarHeader>
                <SidebarContent>

                    {tabs[selectedSidebarTabIndex]?.value === "comments" &&
                        <AppComments
                            ref={commentRef}
                            title={t('comments.title')}
                            categories={commentCategories}
                            items={comments}
                            onCreateCategory={() => {
                                dispatch(addCommentCategory())
                            }}
                            onUpdateCategory={(category: CommentCategory) => {
                                dispatch(updateCommentCategory(category))
                            }}
                            onDeleteCategory={(category: CommentCategory, comments: AppComment[], categories: CommentCategory[]) => {
                                setDeleteCommentCategoryDialogOpen({ open: true, category: category, comments: comments, categories: categories })
                            }}
                            onEditComment={async (comment: AppComment) => {
                                const userInfo = await window.system.getUserInfo() as unknown as UserInfo
                                comment.author = userInfo?.username
                                dispatch(editComment(comment))
                            }}
                            onDeleteComment={(comment: AppComment) => {
                                dispatch(deleteComment(comment))
                                onDeleteComments([comment])
                            }}
                            onMoveCommentToCategory={(comment: AppComment, category: CommentCategory | null) => {
                                dispatch(moveCommentToCategoryId({
                                    comment: comment,
                                    categoryId: category?.id ?? undefined
                                }))
                            }}
                            selectedComment={selectedComment}
                            onClickComment={(comment: AppComment) => {
                                onClickComment(comment)
                                dispatch(selectComment(comment))
                            }}
                        />
                    }

                    {tabs[selectedSidebarTabIndex]?.value === "bookmarks" &&
                        <AppBookmarks
                            ref={bookmarkRef}
                            title={t('bookmarks.title')}
                            categories={bookmarkCategories}
                            items={bookmarks}
                            onCreateCategory={() => {
                                dispatch(addBookmarkCategory())
                            }}
                            onUpdateCategory={(category: BookmarkCategory) => {
                                dispatch(updateBookmarkCategory(category))
                            }}
                            onDeleteCategory={(category: BookmarkCategory, bookmarks: Bookmark[], categories: BookmarkCategory[]) => {
                                setDeleteCategoryDialogOpen({ open: true, category: category, bookmarks: bookmarks, categories: categories })
                            }}
                            onEditBookmark={async (bookmark: Bookmark) => {
                                const userInfo = await window.system.getUserInfo() as unknown as UserInfo
                                bookmark.author = userInfo?.username
                                dispatch(editBookmark(bookmark))
                            }}
                            onDeleteBookmark={(bookmark: Bookmark) => {
                                dispatch(deleteBookmark(bookmark))
                                onDeleteBookmarks([bookmark])
                            }}
                            onMoveBookmarkToCategory={(bookmark: Bookmark, category: BookmarkCategory | null) => {
                                dispatch(moveBookmarkToCategoryId({
                                    bookmark: bookmark,
                                    categoryId: category?.id ?? undefined
                                }))
                            }}
                            selectedBookmark={selectedBookmark}
                            onClickBookmark={(bookmark: Bookmark) => {
                                onClickBookmark(bookmark)
                                dispatch(selectBookmark(bookmark))
                            }}
                        />}

                    {tabs[selectedSidebarTabIndex]?.value === "tableOfContents" &&
                        <TableOfContents
                            tocStructure={tocStructure}
                            tocSettings={tocSettings}
                            layoutTemplate={layoutTemplate}
                            templateOrder={sort}
                            onUpdateTocSettings={(tocSettings: TocSettings) => {
                                dispatch(updateTocSettings(tocSettings));
                            }}
                            onClickHeadingIndex={(index: number) => {
                                onClickHeadingIndex(index);
                            }}
                        />}
                </SidebarContent>
                <SidebarRail />
            </Sidebar>

            {/* Move Bookmark To Category Dialog */}
            <Dialog
                open={moveBookmarkToCategoryDialogOpen.open}
                onOpenChange={() => setMoveBookmarkToCategoryDialogOpen({ open: false })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {t('move_bookmark_dialog.title')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('move_bookmark_dialog.description')}
                        </DialogDescription>
                    </DialogHeader>
                    <Select onValueChange={(value) => {
                        setNewCategoryIdToMoveBookmarks(
                            (value === "UNCATEGORISED") ?
                                null :
                                value)
                    }}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            {moveBookmarkToCategoryDialogOpen.bookmark?.categoryId &&
                                <SelectItem value="UNCATEGORISED">Uncategorised</SelectItem>}
                            {moveBookmarkToCategoryDialogOpen.categories
                                ?.filter(category => category.id !== moveBookmarkToCategoryDialogOpen.bookmark?.categoryId)
                                ?.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                    <DialogFooter>
                        <Button
                            type="submit"
                            intent="secondary"
                            variant="filled"
                            size="mini"
                            onClick={() => {
                                setMoveBookmarkToCategoryDialogOpen({ open: false })
                            }}
                        >
                            <span>{t('move_bookmark_dialog.buttons.cancel')}</span>
                        </Button>
                        <Button
                            type="submit"
                            intent="primary"
                            variant="filled"
                            size="mini"
                            onClick={() => {
                                setMoveBookmarkToCategoryDialogOpen({ open: false })
                                if (moveBookmarkToCategoryDialogOpen.bookmark && moveBookmarkToCategoryDialogOpen) {
                                    dispatch(moveBookmarkToCategoryId({
                                        bookmark: moveBookmarkToCategoryDialogOpen.bookmark,
                                        categoryId: newCategoryIdToMoveBookmarks ?? undefined
                                    }))
                                }
                            }}
                        >
                            <span>{t('move_bookmark_dialog.buttons.move')}</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Bookmark Category Dialog */}
            <Dialog
                open={deleteCategoryDialogOpen.open}
                onOpenChange={() => setDeleteCategoryDialogOpen({ open: false })}>
                <DialogContent >
                    <DialogHeader>
                        <DialogTitle>
                            {t('delete_bookmark_category_dialog.title')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('delete_bookmark_category_dialog.description')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="submit"
                            intent="secondary"
                            variant="filled"
                            size="mini"
                            onClick={() => setDeleteCategoryDialogOpen({ open: false })}
                        >
                            <span>{t('delete_bookmark_category_dialog.buttons.cancel')}</span>
                        </Button>
                        <Button
                            type="submit"
                            intent="destructive"
                            variant="filled"
                            size="mini"
                            onClick={() => {
                                setDeleteCategoryDialogOpen({ open: false })
                                if (deleteCategoryDialogOpen.category) {
                                    dispatch(deleteBookmarkCategory(deleteCategoryDialogOpen.category))
                                    onDeleteBookmarks(deleteCategoryDialogOpen.bookmarks)
                                }
                            }}
                        >
                            <span>{t('delete_bookmark_category_dialog.buttons.delete')}</span>
                        </Button>
                        {deleteCategoryDialogOpen.bookmarks && deleteCategoryDialogOpen.bookmarks?.length > 0 &&
                            <Button
                                type="submit"
                                intent="secondary"
                                variant="border"
                                size="mini"
                                onClick={() => {
                                    setDeleteCategoryDialogOpen({ open: false })
                                    setMoveBookmarksFromCategoryDialogOpen({ open: true, category: deleteCategoryDialogOpen.category, categories: deleteCategoryDialogOpen.categories })
                                }}
                            >
                                <span>{t('delete_bookmark_category_dialog.buttons.move')}</span>
                            </Button>
                        }
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Move Bookmarks From Category To Category Dialog */}
            <Dialog
                open={moveBookmarksFromCategoryDialogOpen.open}
                onOpenChange={() => setMoveBookmarksFromCategoryDialogOpen({ open: false })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {t('move_bookmarks_dialog.title')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('move_bookmarks_dialog.description')}
                        </DialogDescription>
                    </DialogHeader>
                    <Select onValueChange={(value) => {
                        setNewCategoryIdToMoveBookmarks(
                            (value === "UNCATEGORISED") ?
                                null :
                                value)
                    }}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="UNCATEGORISED">Uncategorised</SelectItem>
                            {moveBookmarksFromCategoryDialogOpen.categories
                                ?.filter(category => category.id !== moveBookmarksFromCategoryDialogOpen.category?.id)
                                .map((category) => (
                                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                    <DialogFooter>
                        <Button
                            type="submit"
                            intent="secondary"
                            variant="filled"
                            size="mini"
                            onClick={() => {
                                setMoveBookmarksFromCategoryDialogOpen({ open: false })
                            }}
                        >
                            <span>{t('move_bookmarks_dialog.buttons.cancel')}</span>
                        </Button>
                        <Button
                            type="submit"
                            intent="primary"
                            variant="filled"
                            size="mini"
                            onClick={() => {
                                setMoveBookmarksFromCategoryDialogOpen({ open: false })
                                if (moveBookmarksFromCategoryDialogOpen.category?.id) {
                                    dispatch(moveBookmarksFromCategory({
                                        categoryId: moveBookmarksFromCategoryDialogOpen.category?.id,
                                        newCategoryId: newCategoryIdToMoveBookmarks
                                    }))
                                }
                            }}
                        >
                            <span>{t('move_bookmarks_dialog.buttons.move')}</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Comment Category Dialog */}
            <Dialog
                open={deleteCommentCategoryDialogOpen.open}
                onOpenChange={() => setDeleteCommentCategoryDialogOpen({ open: false })}>
                <DialogContent >
                    <DialogHeader>
                        <DialogTitle>
                            {t('delete_comment_category_dialog.title')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('delete_comment_category_dialog.description')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="submit"
                            intent="secondary"
                            variant="filled"
                            size="mini"
                            onClick={() => setDeleteCommentCategoryDialogOpen({ open: false })}
                        >
                            <span>{t('delete_comment_category_dialog.buttons.cancel')}</span>
                        </Button>
                        <Button
                            type="submit"
                            intent="destructive"
                            variant="filled"
                            size="mini"
                            onClick={() => {
                                setDeleteCommentCategoryDialogOpen({ open: false })
                                if (deleteCommentCategoryDialogOpen.category) {
                                    dispatch(deleteCommentCategory(deleteCommentCategoryDialogOpen.category))
                                    onDeleteComments(deleteCommentCategoryDialogOpen.comments)
                                }
                            }}
                        >
                            <span>{t('delete_comment_category_dialog.buttons.delete')}</span>
                        </Button>
                        {deleteCommentCategoryDialogOpen.comments && deleteCommentCategoryDialogOpen.comments?.length > 0 &&
                            <Button
                                type="submit"
                                intent="secondary"
                                variant="border"
                                size="mini"
                                onClick={() => {
                                    setDeleteCommentCategoryDialogOpen({ open: false })
                                    setMoveCommentsFromCategoryDialogOpen({ open: true, category: deleteCommentCategoryDialogOpen.category, categories: deleteCommentCategoryDialogOpen.categories })
                                }}
                            >
                                <span>{t('delete_comment_category_dialog.buttons.move')}</span>
                            </Button>
                        }
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Move Comments From Category To Category Dialog */}
            <Dialog
                open={moveCommentsFromCategoryDialogOpen.open}
                onOpenChange={() => setMoveCommentsFromCategoryDialogOpen({ open: false })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {t('move_comments_dialog.title')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('move_comments_dialog.description')}
                        </DialogDescription>
                    </DialogHeader>
                    <Select onValueChange={(value) => {
                        setNewCategoryIdToMoveBookmarks(
                            (value === "UNCATEGORISED") ?
                                null :
                                value)
                    }}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="UNCATEGORISED">Uncategorised</SelectItem>
                            {moveCommentsFromCategoryDialogOpen.categories
                                ?.filter(category => category.id !== moveCommentsFromCategoryDialogOpen.category?.id)
                                .map((category) => (
                                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                    <DialogFooter>
                        <Button
                            type="submit"
                            intent="secondary"
                            variant="filled"
                            size="mini"
                            onClick={() => {
                                setMoveCommentsFromCategoryDialogOpen({ open: false })
                            }}
                        >
                            <span>{t('move_comments_dialog.buttons.cancel')}</span>
                        </Button>
                        <Button
                            type="submit"
                            intent="primary"
                            variant="filled"
                            size="mini"
                            onClick={() => {
                                setMoveCommentsFromCategoryDialogOpen({ open: false })
                                if (moveCommentsFromCategoryDialogOpen.category?.id) {
                                    dispatch(moveCommentsFromCategory({
                                        categoryId: moveCommentsFromCategoryDialogOpen.category?.id,
                                        newCategoryId: newCategoryIdToMoveBookmarks
                                    }))
                                }
                            }}
                        >
                            <span>{t('move_comments_dialog.buttons.move')}</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Move Comment To Category Dialog */}
            <Dialog
                open={moveCommentToCategoryDialogOpen.open}
                onOpenChange={() => setMoveCommentToCategoryDialogOpen({ open: false })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {t('move_comment_dialog.title')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('move_comment_dialog.description')}
                        </DialogDescription>
                    </DialogHeader>
                    <Select onValueChange={(value) => {
                        setNewCategoryIdToMoveBookmarks(
                            (value === "UNCATEGORISED") ?
                                null :
                                value)
                    }}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            {moveCommentToCategoryDialogOpen.comment?.categoryId &&
                                <SelectItem value="UNCATEGORISED">Uncategorised</SelectItem>}
                            {moveCommentToCategoryDialogOpen.categories
                                ?.filter(category => category.id !== moveCommentToCategoryDialogOpen.comment?.categoryId)
                                ?.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                    <DialogFooter>
                        <Button
                            type="submit"
                            intent="secondary"
                            variant="filled"
                            size="mini"
                            onClick={() => {
                                setMoveCommentToCategoryDialogOpen({ open: false })
                            }}
                        >
                            <span>{t('move_comment_dialog.buttons.cancel')}</span>
                        </Button>
                        <Button
                            type="submit"
                            intent="primary"
                            variant="filled"
                            size="mini"
                            onClick={() => {
                                setMoveCommentToCategoryDialogOpen({ open: false })
                                if (moveCommentToCategoryDialogOpen.comment && moveCommentToCategoryDialogOpen) {
                                    dispatch(moveCommentToCategoryId({
                                        comment: moveCommentToCategoryDialogOpen.comment,
                                        categoryId: newCategoryIdToMoveBookmarks ?? undefined
                                    }))
                                }
                            }}
                        >
                            <span>{t('move_comment_dialog.buttons.move')}</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
})

export default Sideview;
