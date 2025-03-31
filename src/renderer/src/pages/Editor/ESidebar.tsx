import { AppTab, AppTabsList } from "@/components/ui/app-tabs-list";
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import Bookmarks from "@/components/app-bookmarks";
import { useEffect, useState } from "react";
import TableOfContents from "@/components/app-table-of-contents";
import Comments from "../Comments";
import { useDispatch, useSelector } from "react-redux";
import { selectBookmarks, selectBookmarksCategories } from "./store/editor.selector";
import { addBookmarkCategory, deleteBookmark, deleteBookmarkCategory } from "./store/editor.slice";

export function ESidebar({ ...props }) {
    const dispatch = useDispatch();

    const [tab, setTab] = useState<AppTab | null>(null);

    const tabs = [
        { value: "comments", label: "1" },
        { value: "bookmarks", label: "2" },
        { value: "tableOfContents", label: "3" },
    ]

    function handleTabChange(tab: AppTab) {
        setTab(tab);
    }

    const bookmarks = useSelector(selectBookmarks);
    const categories = useSelector(selectBookmarksCategories);

    useEffect(() => {
        console.log("bookmarks:", bookmarks)
        console.log("categories:", categories)
    }, [bookmarks, categories])

    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <AppTabsList
                    tabs={tabs}
                    selectedTab={tab}
                    selectedIndex={0}
                    onTabChange={(tab) => handleTabChange(tab)}
                />
            </SidebarHeader>
            <SidebarContent>
                {tab?.value === "comments" && <Comments />}
                {tab?.value === "bookmarks" &&
                    <Bookmarks
                        title="Bookmarks"
                        categories={categories}
                        onDeleteCategory={(index: number) => {
                            dispatch(deleteBookmarkCategory(index))
                        }}
                        onClickBookmark={(id: string) => {
                            console.log("id:", id)
                        }}
                        onAddCategory={() => {
                            dispatch(addBookmarkCategory())
                        }}
                        onDeleteBookmark={(id: string) => {
                            dispatch(deleteBookmark(id))
                        }}
                        onEditBookmark={(id: string) => {
                            console.log("id:", id)
                        }}
                        items={bookmarks}
                    />}
                {tab?.value === "tableOfContents" && <TableOfContents />}
            </SidebarContent>
        </Sidebar>
    )
}
