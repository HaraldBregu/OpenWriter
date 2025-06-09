import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import ESidebar from "./ESidebar";
import { EditorFooter } from "./EditorFooter";
import { useEffect, useRef, useState } from "react";
import { Content } from "./Content";
import { useDispatch, useSelector } from "react-redux";
import {
    addApparatusAtTop,
    setBookmark,
    setComment,
    setEditorMode,
    setEmphasisState,
    setSidebarOpen,
    togglePrintPreviewVisible,
} from "./store/editor/editor.slice";
import {
    getSidebarOpen,
    selectBookmarkActive,
    selectCanAddBookmark,
    selectCanAddComment,
    selectCanUndo,
    selectCommentActive,
    selectEditorMode,
    selectHeadingEnabled,
    selectHistory,
    selectPrintPreviewVisible,
    selectToolbarEmphasisState
} from "./store/editor/editor.selector";
import Toolbar from "./EditorToolbar";
import { useIpcRenderer } from "@/hooks/use-ipc-renderer";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { EditorApparatus } from "./EditorApparatus";
import EditorPreview from "./EditorPreview";
import { bookmarkCategoriesSelector } from "./store/bookmark/bookmark.selector";
import { commentCategoriesSelector } from "./store/comment/comments.selector";
import CustomizeToolbarModal from "../preferences/CustomizeToolbar";

export const ELayout = () => {
    const sidebarRef = useRef<any>();
    const editorTextRef = useRef<any>();
    const editorApparatusesRef = useRef<any>();

    const [editorContainerRef, setEditorContainerRef] = useState<any>();
    const [isCustomizeToolbarOpen, setIsCustomizeToolbarOpen] = useState(false);
    const [toolbarAdditionalItems, setToolbarAdditionalItems] = useState<string[]>([]);

    const [showToolbar, setShowToolbar] = useState(true);

    const headingEnabled = useSelector(selectHeadingEnabled);
    const sidebarOpen = useSelector(getSidebarOpen);
    const printPreviewVisible = useSelector(selectPrintPreviewVisible);

    const dispatch = useDispatch();
    const handleSetSidebarOpen = () => {
        dispatch(setSidebarOpen(!sidebarOpen));
    }

    const canUndo = useSelector(selectCanUndo);

    useIpcRenderer((ipc) => {
        ipc.on('toggle-toolbar', (_, showToolbar) => {
            setShowToolbar(showToolbar);
        });

        ipc.on('add-apparatus', (_, type: "CRITICAL" | "PAGE_NOTES" | "SECTION_NOTES" | "INNER_MARGIN" | "OUTER_MARGIN") => {
            dispatch(addApparatusAtTop(type))
        });

        ipc.on('toggle-print-preview', (_) => {
            dispatch(togglePrintPreviewVisible())
        });

        ipc.on("customize-toolbar", () => {
            setIsCustomizeToolbarOpen(true);
        });

        ipc.on('toolbar-additional-items', (_, items: string[]) => {
            setToolbarAdditionalItems(items);
        });

        return () => {
            ipc.cleanup()
        }
    }, [window.electron.ipcRenderer]);

    useEffect(() => {
        window.application.toolbarIsVisible().then(setShowToolbar);
    }, [window.application.toolbarIsVisible]);

    useEffect(() => {
        window.application.toolbarAdditionalItems().then(setToolbarAdditionalItems);
    }, [window.application.toolbarAdditionalItems]);

    const handleSaveToolbarOptions = (items: string[]) => {
        window.electron.ipcRenderer.send('application:updateToolbarAdditionalItems', items);
        setIsCustomizeToolbarOpen(false);
    }

    return (
        <SidebarProvider open={sidebarOpen}>
            <ESidebar
                ref={sidebarRef}
                onClickBookmark={(bookmark: Bookmark) => {
                    editorTextRef.current?.scrollToBookmark(bookmark.id)
                }}
                onClickHeading={(id: string) => {
                    editorTextRef.current?.scrollToHeading(id)
                }}
                onDeleteBookmarks={(bookmarks?: Bookmark[]) => {
                    editorTextRef.current?.deleteBookmarks(bookmarks)
                }}
                onDeleteComments={(comments?: AppComment[]) => {
                    editorTextRef.current?.deleteComments(comments)
                }}
                onClickComment={(comment: AppComment) => {
                    editorTextRef.current?.scrollToComment(comment)
                }}
            />
            <SidebarInset className="overflow-hidden">
                <Toolbar
                    viewToolbar={showToolbar}
                    includeOptionals={toolbarAdditionalItems}
                    sidebarOpen={sidebarOpen}
                    toggleNonPrintingCharacters={() => {
                        editorContainerRef.current?.toggleNonPrintingCharacters()
                    }}
                    onClickToggleSidebar={handleSetSidebarOpen}
                    emphasisState={useSelector(selectToolbarEmphasisState)}
                    onEmphasisStateChange={(emphasisState: EmphasisState) => {
                        dispatch(setEmphasisState(emphasisState))
                        editorContainerRef.current?.focus()
                    }}
                    onHeadingLevelChange={(headingLevel: number) => {
                        editorContainerRef.current?.setHeadingLevel(headingLevel)
                    }}
                    onSetBody={() => {
                        editorContainerRef.current?.setBody()
                    }}
                    onFontFamilyChange={(fontFamily: string) => {
                        editorContainerRef.current?.setFontFamily(fontFamily)
                    }}
                    onFontSizeChange={(fontSize: string) => {
                        editorContainerRef.current?.setFontSize(fontSize)
                    }}
                    onBoldChange={(bold: boolean) => {
                        editorContainerRef.current?.setBold(bold)
                    }}
                    onItalicChange={(italic: boolean) => {
                        editorContainerRef.current?.setItalic(italic)
                    }}
                    onUnderlineChange={(underline: boolean) => {
                        editorContainerRef.current?.setUnderline(underline)
                    }}
                    onTextColorChange={(textColor: string) => {
                        editorContainerRef.current?.setTextColor(textColor)
                    }}
                    onHighlightColorChange={(highlightColor: string) => {
                        editorContainerRef.current?.setHighlightColor(highlightColor)
                    }}
                    onSetBlockquote={(blockquote: boolean) => {
                        editorContainerRef.current?.setBlockquote(blockquote)
                    }}
                    onSetTextAlignment={(alignment: string) => {
                        editorContainerRef.current?.setTextAlignment(alignment)
                    }}
                    onSetLineSpacing={(spacing: Spacing) => {
                        editorContainerRef.current?.setLineSpacing(spacing)
                    }}
                    onSetListStyle={(style: BulletStyle) => {
                        editorContainerRef.current?.setListStyle(style)
                    }}
                    onSetSuperscript={(superscript: boolean) => {
                        editorContainerRef.current?.setSuperscript(superscript)
                    }}
                    onSetSubscript={(subscript: boolean) => {
                        editorContainerRef.current?.setSubscript(subscript)
                    }}
                    onIncreaseIndent={() => {
                        editorContainerRef.current?.increaseIndent();
                    }}
                    onDecreaseIndent={() => {
                        editorContainerRef.current?.decreaseIndent();
                    }}
                    onShowCustomSpacing={() => {
                        editorContainerRef.current?.showCustomSpacing();
                    }}
                    onShowResumeNumbering={() => {
                        editorContainerRef.current?.showResumeNumbering()
                    }}
                    continuePreviousNumbering={() => {
                        editorContainerRef.current?.continuePreviousNumbering()
                    }}
                    headingEnabled={headingEnabled}
                    // UNDO REDO HISTORY
                    history={useSelector(selectHistory)}
                    canUndo={canUndo}
                    onUndo={(action) => {
                        editorContainerRef.current?.undo(action)
                    }}
                    onRedo={() => {
                        editorContainerRef.current?.redo()
                    }}
                    // EDITOR MODE
                    editorMode={useSelector(selectEditorMode)}
                    setEditorMode={(mode) => {
                        dispatch(setEditorMode(mode))
                    }}
                    // BOOKMARK
                    bookmarksCategories={useSelector(bookmarkCategoriesSelector)}
                    bookmarkActive={useSelector(selectBookmarkActive)}
                    canAddBookmark={useSelector(selectCanAddBookmark)}
                    onClickAddBookmark={(categoryId?: string) => {
                        editorContainerRef.current?.addBookmark(categoryId)
                    }}
                    onUnsetBookmark={() => {
                        dispatch(setBookmark(false))
                        editorContainerRef.current?.unsetBookmark()
                    }}
                    // COMMENT
                    commentCategories={useSelector(commentCategoriesSelector)}
                    commentActive={useSelector(selectCommentActive)}
                    canAddComment={useSelector(selectCanAddComment)}
                    onClickAddComment={(categoryId?: string) => {
                        editorContainerRef.current?.addComment(categoryId)
                    }}
                    onUnsetComment={() => {
                        dispatch(setComment(false))
                        editorContainerRef.current?.unsetComment()
                    }}
                    showCustomizeToolbar={() => {
                        setIsCustomizeToolbarOpen(true);
                    }}
                />
                <ResizablePanelGroup direction="horizontal">
                    <ResizablePanel minSize={35} defaultSize={40}>
                        <Content
                            ref={editorTextRef}
                            onFocusEditor={() => {
                                setEditorContainerRef(editorTextRef)
                            }}
                            showToolbar={showToolbar}
                            onRegisterBookmark={(id: string, categoryId?: string) => {
                                sidebarRef.current?.registerBookmark(id, categoryId)
                            }}
                            onRegisterComment={(id: string, categoryId?: string) => {
                                sidebarRef.current?.registerComment(id, categoryId)
                            }}
                        />
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel minSize={30} defaultSize={40}>
                        <EditorApparatus
                            ref={editorApparatusesRef}
                            onFocusEditor={() => {
                                setEditorContainerRef(editorApparatusesRef)
                            }}
                        />
                    </ResizablePanel>
                    {printPreviewVisible &&
                        <>
                            <ResizableHandle withHandle />
                            <ResizablePanel minSize={15} maxSize={20} collapsible={true}>
                                <EditorPreview />
                            </ResizablePanel>
                        </>
                    }
                </ResizablePanelGroup>
                <CustomizeToolbarModal
                    existingToolbarItems={toolbarAdditionalItems} // Replace with actual existing toolbar items
                    isOpen={isCustomizeToolbarOpen}
                    onCancel={() => setIsCustomizeToolbarOpen(false)}
                    onSaveToolbarOptions={handleSaveToolbarOptions}
                />
                <EditorFooter />
            </SidebarInset>
        </SidebarProvider>
    )
}