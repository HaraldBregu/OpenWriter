import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import Sideview from "./Sideview";
import Footer from "./Footer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Content } from "./Content";
import { useDispatch, useSelector } from "react-redux";
import {
    addApparatusAtTop,
    setBookmark,
    setComment,
    setEditorMode,
    setEmphasisState,
    togglePrintPreviewVisible,
    toggleTocVisibility,
} from "./store/editor/editor.slice";
import {
    selectBookmarkActive,
    selectCanAddBookmark,
    selectCanAddComment,
    selectCanUndo,
    selectCommentActive,
    selectEditorMode,
    selectHeadingEnabled,
    selectHistory,
    selectPrintPreviewVisible,
    selectToolbarEmphasisState,
    showTocChecked
} from "./store/editor/editor.selector";
import Toolbar from "./Toolbar";
import { useIpcRenderer } from "@/hooks/use-ipc-renderer";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import Preview from "./Preview";
import { bookmarkCategoriesSelector } from "./store/bookmark/bookmark.selector";
import { commentCategoriesSelector } from "./store/comment/comments.selector";
import CustomizeToolbarModal from "./dialogs/CustomizeToolbar";
import PageSetupOptionsModal from "./dialogs/PageSetupOptionsModal";
import { useReducer } from "react";
import { editorContext as EditorContext, reducer, initialState, setSiglumSetupDialogVisible, setFontFamilyList, setAddSymbolVisible } from "./provider";
import Apparatuses from "./Apparatuses";
import LineNumberSettings from "./dialogs/LineNumberSettings";
import PageNumberSettings from "./dialogs/PageNumberSettings";
import FooterSettings from "./dialogs/FooterSettings";
import HeaderSettings from "./dialogs/HeaderSettings";
import TocSettings from "./dialogs/TocSettings";
import { selectHeadingAndCustomStyles } from "./store/editor-styles/editor-styles.selector";
import { useEditor } from "./hooks/useEditor";
import { updateStyles } from "./store/editor-styles/editor-styles.slice";
import AddSymbolDialog from "./dialogs/AddSymbol";
import SetupDialogs from "./dialogs/SetupDialogs";


const EditorContextProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, dispatch] = useReducer(reducer, initialState);
    return (
        <EditorContext.Provider value={[state, dispatch]}>
            {children}
        </EditorContext.Provider>
    )
}

export const Editor = () => {
    return (
        <EditorContextProvider>
            <ELayout />
        </EditorContextProvider>
    )
}

const ELayout = () => {
    const [state, dispatchEditor] = useEditor()

    const sidebarRef = useRef<any>();
    const editorTextRef = useRef<any>();
    const editorApparatusesRef = useRef<any>();

    const [editorContainerRef, setEditorContainerRef] = useState<any>();
    const [isCustomizeToolbarOpen, setIsCustomizeToolbarOpen] = useState(false);
    const [isPageSetupOptOpen, setIsPageSetupOptOpen] = useState<boolean>(false)
    const [toolbarAdditionalItems, setToolbarAdditionalItems] = useState<string[]>([]);
    const [isLineNumberSetupOpen, setIsLineNumberSetupOpen] = useState(false);
    const [isPageNumberSetupOpen, setIsPageNumberSetupOpen] = useState(false);
    const [isFooterSetupOpen, setIsFooterSetupOpen] = useState(false);
    const [isHeaderSetupOpen, setIsHeaderSetupOpen] = useState(false);
    const [isTocSetupOpen, setIsTocSetupOpen] = useState(false);
    const [showToolbar, setShowToolbar] = useState(true);

    const headingEnabled = useSelector(selectHeadingEnabled);
    const printPreviewVisible = useSelector(selectPrintPreviewVisible);
    const showToc = useSelector(showTocChecked);
    const dispatch = useDispatch();
    const canUndo = useSelector(selectCanUndo);
    const styles = useSelector(selectHeadingAndCustomStyles);

    useIpcRenderer((ipc) => {

        ipc.on('toggle-toolbar', (_, showToolbar) => {
            setShowToolbar(showToolbar);
        });

        ipc.on("page-number-settings", () => {
            setIsPageNumberSetupOpen(true);
        });

        ipc.on("line-numbers-settings", () => {
            setIsLineNumberSetupOpen(true);
        });

        ipc.on("header-settings", () => {
            setIsHeaderSetupOpen(true);
        });

        ipc.on("footer-settings", () => {
            setIsFooterSetupOpen(true);
        });

        ipc.on("toc-settings", () => {
            setIsTocSetupOpen(true);
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

        ipc.on("page-setup", () => {
            setIsPageSetupOptOpen(true);
        });

        ipc.on('toolbar-additional-items', (_, items: string[]) => {
            setToolbarAdditionalItems(items);
        });

        ipc.on('toggle-toc-visibility', () => {
            dispatch(toggleTocVisibility());
        });

        ipc.on('CmdOrCtrl+Alt+T', () => {
            dispatch(toggleTocVisibility());
        });

        ipc.on('sigla-setup', () => {
            dispatchEditor(setSiglumSetupDialogVisible(true))
        });

        ipc.send('request-system-fonts');
        ipc.on('receive-system-fonts', (_: any, fonts: string[]) => {
            dispatchEditor(setFontFamilyList(fonts))
        });

        return () => {
            ipc.off('receive-system-fonts');
            ipc.cleanup()
        }
    }, [window.electron.ipcRenderer]);

    useEffect(() => {
        window.menu.setTocVisibility(showToc);
    }, [showToc]);

    useEffect(() => {
        window.application.toolbarIsVisible().then(setShowToolbar);
    }, [window.application.toolbarIsVisible]);

    useEffect(() => {
        window.application.toolbarAdditionalItems().then(setToolbarAdditionalItems);
    }, [window.application.toolbarAdditionalItems]);

    // @REFACTOR: check again this solution, i think it's not the best way to do it
    useEffect(() => {
        const fetchAppStyles = async () => {
            try {
                const defaultStyles = JSON.parse(await window.doc.getStyle("default.stl"));
                if (defaultStyles.length > 0) {
                    dispatch(updateStyles(defaultStyles))
                }
            } catch (err) {
                console.log("err:", err)
            }
        }
        // Setup the application's defaultStyle
        fetchAppStyles()
    }, [])

    // @REFACTOR: check again this solution
    const handleSaveToolbarOptions = useCallback((items: string[]) => {
        window.electron.ipcRenderer.send('application:updateToolbarAdditionalItems', items);
        setIsCustomizeToolbarOpen(false);
    }, [])

    const handleAddSymbol = useCallback((character: number) => {
        editorContainerRef?.current.insertCharacter(character);
    }, [])

    const siglumList = useMemo(() => state.siglumList, [state.siglumList]);

    return (
        <>
            <SidebarProvider defaultOpen={false}>
                <Sideview
                    ref={sidebarRef}
                    onClickBookmark={(bookmark: Bookmark) => {
                        editorTextRef.current?.scrollToBookmark(bookmark.id)
                    }}
                    onClickHeadingIndex={(index: number) => {
                        editorTextRef.current?.scrollToHeadingIndex(index)
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
                        styles={styles}
                        viewToolbar={showToolbar}
                        editorIsFocused={state.isFocused}
                        includeOptionals={toolbarAdditionalItems}
                        siglumList={siglumList}
                        onSelectSiglum={(siglum: Siglum) => {
                            console.log("siglum:", siglum)
                        }}
                        toggleNonPrintingCharacters={() => {
                            editorContainerRef.current?.toggleNonPrintingCharacters()
                        }}
                        emphasisState={useSelector(selectToolbarEmphasisState)}
                        onEmphasisStateChange={(emphasisState: EmphasisState) => {
                            dispatch(setEmphasisState(emphasisState))
                            editorContainerRef.current?.focus()
                        }}
                        onHeadingLevelChange={(headingLevel: number) => {
                            editorContainerRef.current?.setHeadingLevel(headingLevel)
                        }}
                        onSetBody={(style) => {
                            editorContainerRef.current?.setBody(style)
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
                        showAddSymbol={() => {
                            dispatchEditor(setAddSymbolVisible(true));
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
                            <Apparatuses
                                ref={editorApparatusesRef}
                                onFocusEditor={() => {
                                    setEditorContainerRef(editorApparatusesRef)
                                }}
                                onRegisterComment={(id: string, categoryId?: string) => {
                                    sidebarRef.current?.registerComment(id, categoryId)
                                }}
                            />
                        </ResizablePanel>
                        {printPreviewVisible &&
                            <>
                                <ResizableHandle withHandle />
                                <ResizablePanel minSize={15} maxSize={20} collapsible={true}>
                                    <Preview />
                                </ResizablePanel>
                            </>
                        }
                    </ResizablePanelGroup>

                    {/* @REFACTOR: move this modal from this position, its a simple modal */}
                    <CustomizeToolbarModal
                        existingToolbarItems={toolbarAdditionalItems} // Replace with actual existing toolbar items
                        isOpen={isCustomizeToolbarOpen}
                        onCancel={() => setIsCustomizeToolbarOpen(false)}
                        onSaveToolbarOptions={handleSaveToolbarOptions}
                    />
                    <Footer />
                </SidebarInset>
            </SidebarProvider>

            {/* MODALS */}

            <LineNumberSettings
                isOpen={isLineNumberSetupOpen}
                setIsOpen={setIsLineNumberSetupOpen}
            />

            <PageNumberSettings
                isOpen={isPageNumberSetupOpen}
                setIsOpen={setIsPageNumberSetupOpen}
            />

            <HeaderSettings
                isOpen={isHeaderSetupOpen}
                setIsOpen={setIsHeaderSetupOpen}
            />

            <FooterSettings
                isOpen={isFooterSetupOpen}
                setIsOpen={setIsFooterSetupOpen}
            />

            <PageSetupOptionsModal isOpen={isPageSetupOptOpen} setIsOpen={setIsPageSetupOptOpen} />

            <TocSettings
                isOpen={isTocSetupOpen}
                setIsOpen={setIsTocSetupOpen}
            />

            <AddSymbolDialog
                isOpen={state.addSymbolVisible}
                onCancel={() => dispatchEditor(setAddSymbolVisible(false))}
                onApply={handleAddSymbol}
            />

            <SetupDialogs />
        </>

    )
}