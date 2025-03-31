import EditorTextArea from "@/components/editor-text-layout"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Editor, useEditor } from "@tiptap/react";
import { ForwardedRef, forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { addCategory, addComment, setCategoriesData } from "../Comments/store/comments.slice";
import { rendererLogger } from "@/utils/logger";
import { useDispatch, useSelector } from "react-redux";
import { getAllCategories } from "../Comments/store/comments.selector";
import { setSidebarOpen } from "../store/main.slice";
import { useHistoryState } from "./hooks";
import { defaultEditorConfig } from "./utils/editorConfigs";
import { v4 as uuidv4 } from 'uuid';
import { selectBookmark, selectComment, selectFontFamily, selectFontSize, selectHeadingLevel, selectHighlightColor, selectIsBold, selectIsHeading, selectIsItalic, selectIsUnderline, selectTextColor } from "./store/editor.selector";
import { addBookmark, setBold, setHeadingLevel, setItalic, setUnderline } from "./store/editor.slice";
import BubbleToolbar from "./components/bubble-toolbar";
import { PageSetupDialog } from "../PageSetupDialog";
interface EContentProps {
}

export const EContent = forwardRef(({ }: EContentProps, ref: ForwardedRef<unknown>) => {
    useImperativeHandle(ref, () => {
        return {
            addBookmark: (category?: string) => {
                if (!activeEditor) return;
                const { from, to } = activeEditor.state.selection;
                const selectedContent = activeEditor.state.doc.textBetween(from, to, ' ');

                const id = uuidv4();

                dispatch(addBookmark({
                    id: id,
                    content: selectedContent,
                    category: category
                }));

                activeEditor
                    .chain()
                    .focus()
                    .setBookmarkText(id)
                    .run()
            },
            addComment: () => {
                if (!activeEditor) return;
                const { from, to } = activeEditor.state.selection;
                const selectedContent = activeEditor.state.doc.textBetween(from, to, ' ');

                if (categories.length === 0) {
                    const categoryId = uuidv4();
                    const index = categories.length + 1;
                    dispatch(addCategory({
                        id: categoryId,
                        name: "Category " + index
                    }));

                    dispatch(addComment({
                        categoryId: categoryId,
                        comment: {
                            title: "New Comment",
                            selectedText: selectedContent,
                            comment: ""
                        }
                    }));
                } else if (categories.length === 1) {
                    dispatch(addComment({
                        categoryId: categories[0].id,
                        comment: {
                            title: "New Comment",
                            selectedText: selectedContent,
                            comment: ""
                        }
                    }));
                } else {
                    dispatch(addComment({
                        categoryId: categories[categories.length - 1].id,
                        comment: {
                            title: "New Comment",
                            selectedText: selectedContent,
                            comment: ""
                        }
                    }));
                }
            }
        }
    })

    /*     const textColorInputRef = useRef<HTMLInputElement>(null);
        const highlightColorInputRef = useRef<HTMLInputElement>(null);
        const undoInputRef = useRef<HTMLInputElement>(null);
     */
    const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
    const [isPageSetupOpen, setIsPageSetupOpen] = useState(false)

    const [editorState, setEditorState] = useState<{
        [editorId: string]: { lastFontSize: string | null; isHeading: boolean }
    }>({
        textEditor: { lastFontSize: null, isHeading: false },
        apparatusEditor: { lastFontSize: null, isHeading: false }
    });

    const dispatch = useDispatch();
    const categories = useSelector(getAllCategories);

    const categoriesRef = useRef(categories);

    useEffect(() => {
        categoriesRef.current = categories;
    }, [categories]);

    const textEditor = useEditor({
        ...defaultEditorConfig,
        onUpdate: () => setActiveEditor(textEditor)
    });

    const apparatusEditor = useEditor({
        ...defaultEditorConfig,
        onUpdate: () => setActiveEditor(apparatusEditor)
    });

    const textHistory = useHistoryState(textEditor);
    const apparatusHistory = useHistoryState(apparatusEditor);

    useEffect(() => {
        if (activeEditor === null) {
            setActiveEditor(textEditor);
        }
    }, []);

    const updateEditorState = useCallback((editorKey: string, updates: Partial<typeof editorState['textEditor']>) => {
        setEditorState((prevState) => ({
            ...prevState,
            [editorKey]: {
                ...prevState[editorKey],
                ...updates,
            },
        }));
    }, []);

    const updateHandler = useCallback(() => {
        if (!activeEditor) return;

        if (!textEditor || !apparatusEditor) return;

        const editorContent = {
            mainText: textEditor.getJSON() || '',
            apparatusText: apparatusEditor.getJSON() || '',
            comments: categoriesRef.current || []
        };
        console.log("🚀 ~ updateHandler ~ editorContent:", editorContent)
        console.log("🚀 ~ updateHandler ~ editorContent:", JSON.stringify(textEditor.getJSON()))
        console.log(JSON.stringify(textEditor.getJSON()))
        console.log("🚀 ~ updateHandler ~ textEditor", textEditor.getHTML())

        const taskId = rendererLogger.startTask("TextEditor", "Content update");

        try {
            window.electron.ipcRenderer.send('currentDocumentUpdate', editorContent);
            rendererLogger.endTask(taskId, "TextEditor", "Editor content updated");
        } catch (error) {
            rendererLogger.error("TextEditor", "Error while sending data to main process", error as Error);
        }

    }, [activeEditor, textEditor, apparatusEditor]);

    useEffect(() => {
        if (activeEditor) {
            activeEditor.on('update', updateHandler);
        }

        return () => {
            if (activeEditor)
                activeEditor.off('update', updateHandler);
        }
    }, [activeEditor, categories]);

    useEffect(() => {
        updateHandler();
    }, [categories])

    useEffect(() => {
        if (!window.electron) return;

        const removeUndoListener = window.electron.ipcRenderer.on("trigger-undo", () => {
            activeEditor?.chain().focus().undo().run();
        });

        const removeRedoListener = window.electron.ipcRenderer.on("trigger-redo", () => {
            activeEditor?.chain().focus().redo().run();
        });

        return () => {
            removeUndoListener();
            removeRedoListener();
        };
    }, [activeEditor]);

    useEffect(() => {
        const taskId = rendererLogger.startTask("TextEditor", "DocOpening initialized");

        try {

            window.electron.ipcRenderer.on('opened-doc', (_event, content: any) => {
                console.log("opened-doc ~ useEffect ~ content:", content)
                if (textEditor) {
                    setOpenedDocContent(content);
                }
            });

            window.electron.ipcRenderer.on('new-doc', (_event, content: any) => {
                console.log("new-doc ~ useEffect ~ content:", content)
                if (textEditor) {
                    setOpenedDocContent(content);
                }
            });

            rendererLogger.endTask(taskId, "TextEditor", "DocOpening action completed");
        } catch (error) {
            rendererLogger.error("TextEditor", "DocOpening: Error while getting data from main process", error as Error);
        }
    }, [textEditor, apparatusEditor]);

    const setOpenedDocContent = (content: DocumentContentParsed) => {
        if (!content) {
            console.error("Received null or undefined document content");
            return;
        }
        const docContent = content; // JSON.parse(content as string);
        if (textEditor && apparatusEditor) {
            console.log("🚀 ~ setOpenedDocContent ~ docContent:", docContent)
            textEditor.commands.setContent(docContent?.mainText);
            apparatusEditor.commands.setContent(docContent?.apparatusText);
            if (docContent?.comments)
                dispatch(setCategoriesData(docContent?.comments));
        }
    }

    const handleAddComment = useCallback(() => {
        if (!activeEditor) return;

        const { from, to } = activeEditor.state.selection;
        const selectedContent = activeEditor.state.doc.textBetween(from, to, ' ');

        if (!selectedContent) return;

        dispatch(setSidebarOpen(true));

        if (categories.length === 0) {
            const categoryId = uuidv4();
            const index = categories.length + 1;
            dispatch(addCategory({
                id: categoryId,
                name: "Category " + index
            }));

            dispatch(addComment({
                categoryId: categoryId,
                comment: {
                    title: "New Comment",
                    selectedText: selectedContent,
                    comment: ""
                }
            }));
        } else if (categories.length === 1) {
            dispatch(addComment({
                categoryId: categories[0].id,
                comment: {
                    title: "New Comment",
                    selectedText: selectedContent,
                    comment: ""
                }
            }));
        } else {
            dispatch(addComment({
                categoryId: categories[categories.length - 1].id,
                comment: {
                    title: "New Comment",
                    selectedText: selectedContent,
                    comment: ""
                }
            }));
        }
    }, [activeEditor, categories, dispatch]);

    useEffect(() => {
        if (!window.electron) return;

        const removeInsertCommentListener = window.electron.ipcRenderer.on("insert-comment", () => {
            handleAddComment();
        });

        const removeListener = window.electron.ipcRenderer.on('show-page-setup', () => {
            setIsPageSetupOpen(true)
        })

        return () => {
            removeInsertCommentListener();
            setIsPageSetupOpen(false)
        };
    }, [activeEditor, categories, handleAddComment]);

    const currentEditorKey = activeEditor === textEditor ? 'textEditor' : 'apparatusEditor';
    const currentEditorState = editorState[currentEditorKey];
    const currentHistory = activeEditor === textEditor ? textHistory : apparatusHistory;


    // Listen for the event
    document.addEventListener("redocustomd", (event) => {
        console.log("Event received:", event);
    });

    // NEW APPROACH
    /*   useEffect(() => {
          if (!textEditor) return
          console.log("handleSelectionUpdatecomment:", commentClicked)
          const handleSelectionUpdate = () => {
              const { from, to } = textEditor.state.selection;
              if (from === to) return; // No selection
              console.log("handleSelectionUpdatecomment:", commentClicked)
              console.log("handleSelectionUpdatecomment", textEditor.state.selection)
       
          };
          textEditor.on('selectionUpdate', handleSelectionUpdate);
          return () => {
              textEditor.off('selectionUpdate', handleSelectionUpdate);
          };
      }, [commentClicked]); */


    const isBold = useSelector(selectIsBold);
    useEffect(() => {
        if (!textEditor) return
        textEditor.chain().focus()[isBold ? 'setBold' : 'unsetBold']().run();
        const handleSelectionUpdate = () => {
            const { from, to } = textEditor.state.selection;
            if (from === to) return; // No selection
            const isBoldSelection = textEditor.isActive('bold');
            dispatch(setBold(isBoldSelection));
        };
        textEditor.on('selectionUpdate', handleSelectionUpdate);
        return () => {
            textEditor.off('selectionUpdate', handleSelectionUpdate);
        };
    }, [textEditor, isBold]);

    const isItalic = useSelector(selectIsItalic);
    useEffect(() => {
        if (!textEditor) return;
        textEditor.chain().focus()[isItalic ? 'setItalic' : 'unsetItalic']().run();
        const handleSelectionUpdate = () => {
            const { from, to } = textEditor.state.selection;
            if (from === to) return; // No selection
            const isItalicSelection = textEditor.isActive('italic');
            dispatch(setItalic(isItalicSelection));
        };
        textEditor.on('selectionUpdate', handleSelectionUpdate);
        return () => {
            textEditor.off('selectionUpdate', handleSelectionUpdate);
        };
    }, [textEditor, isItalic]);

    const isUnderline = useSelector(selectIsUnderline);
    useEffect(() => {
        if (!textEditor) return;
        textEditor.chain().focus()[isUnderline ? 'setUnderline' : 'unsetUnderline']().run();
        const handleSelectionUpdate = () => {
            const { from, to } = textEditor.state.selection;
            if (from === to) return; // No selection
            const isUnderlineSelection = textEditor.isActive('underline');
            dispatch(setUnderline(isUnderlineSelection));
        };
        textEditor.on('selectionUpdate', handleSelectionUpdate);
        return () => {
            textEditor.off('selectionUpdate', handleSelectionUpdate);
        };
    }, [textEditor, isUnderline]);

    // REFACTOR: Gestione del HEADING 
    const isHeading = useSelector(selectIsHeading);
    const headingLevel = useSelector(selectHeadingLevel);
    useEffect(() => {
        if (!textEditor) return

        if (isHeading) {
            textEditor.chain().focus().toggleHeading({ level: headingLevel as 1 | 2 | 3 | 4 | 5 | 6 }).unsetMark("textStyle").run();
        } else {
            textEditor.chain().focus().setParagraph().run();
        }

        const handleSelectionUpdate = () => {
            const { from, to } = textEditor.state.selection;
            if (from === to) return;
            const isHeadingSelection = textEditor.isActive('heading', { level: headingLevel });
            if (isHeadingSelection) {
                dispatch(setHeadingLevel(headingLevel));
            } else {
                dispatch(setHeadingLevel(0));
            }
        };

        textEditor.on('selectionUpdate', handleSelectionUpdate);
        return () => {
            textEditor.off('selectionUpdate', handleSelectionUpdate);
        };
    }, [textEditor, isHeading, headingLevel]);

    const fontFamily = useSelector(selectFontFamily);
    useEffect(() => {
        if (!textEditor) return;
        if (fontFamily === "default") {
            textEditor.chain().focus().setFontFamily(fontFamily).run();
        } else {
            textEditor.chain().focus().setFontFamily(fontFamily).run();
        }
    }, [textEditor, fontFamily]);

    // REFACTOR: Gestione del FONT SIZE
    const fontSize = useSelector(selectFontSize);
    useEffect(() => {
        if (!textEditor) return;
        textEditor.chain().focus().setMark("textStyle", { fontSize: `${fontSize}pt` }).run();
    }, [textEditor, fontSize]);

    const textColor = useSelector(selectTextColor);
    useEffect(() => {
        if (!textEditor) return;
        textEditor.chain().focus().setColor(textColor).run();
    }, [textEditor, textColor]);

    const highlightColor = useSelector(selectHighlightColor);
    useEffect(() => {
        if (!textEditor) return;
        const { from, to } = textEditor.state.selection;
        if (from !== to) {
            if (highlightColor !== "none") {
                textEditor.chain().focus().setHighlight({ color: highlightColor }).run();
                textEditor.chain().focus().setTextSelection(to).insertContent(" ").unsetMark("highlight").run();
            } else {
                textEditor.chain().focus().unsetHighlight().run();
            }
        }
    }, [textEditor, highlightColor]);


    /*     const redo = useSelector(selectRedo);
        useEffect(() => {
            if (!textEditor) return;
            textEditor.chain().focus().redo().run();
            const canRedo = textEditor.can().redo();
            console.log("🚀 ~ canRedo:", canRedo)
            console.log("🚀 ~ redo:", redo)
        }, [textEditor, redo]); */


    const comment = useSelector(selectComment);
    useEffect(() => {
        if (!activeEditor) return;
        if (comment) {
            const { from, to } = activeEditor.state.selection;
            const selectedContent = activeEditor.state.doc.textBetween(from, to, ' ');

            if (categories.length === 0) {
                const categoryId = uuidv4();
                const index = categories.length + 1;
                dispatch(addCategory({
                    id: categoryId,
                    name: "Category " + index
                }));

                dispatch(addComment({
                    categoryId: categoryId,
                    comment: {
                        title: "New Comment",
                        selectedText: selectedContent,
                        comment: ""
                    }
                }));
            } else if (categories.length === 1) {
                dispatch(addComment({
                    categoryId: categories[0].id,
                    comment: {
                        title: "New Comment",
                        selectedText: selectedContent,
                        comment: ""
                    }
                }));
            } else {
                dispatch(addComment({
                    categoryId: categories[categories.length - 1].id,
                    comment: {
                        title: "New Comment",
                        selectedText: selectedContent,
                        comment: ""
                    }
                }));
            }
        }
    }, [textEditor, comment])

    const bookmark = useSelector(selectBookmark);
    useEffect(() => {
        if (!activeEditor) return;
        if (bookmark) {
            /*   console.log("bookmark:", bookmark)
              const { from, to } = activeEditor.state.selection;
              const selectedContent = activeEditor.state.doc.textBetween(from, to, ' ');
              console.log("selectedContent:", selectedContent)
              const id = uuidv4(); */
            /*
            const didSave = activeEditor.chain()
                .focus()
                .setMark('apparatusText', { id })
                .run(); 
                */


            /*   if (activeEditor.chain()
                  .focus()
                  .setMark('apparatusText', { id })
                  .run()) {
              } */

            // Save Mark id "c9606587-b9a9-46bb-ba2d-b4a599de806d"
            // Save the selectedContent

            //dispatch(addBookmark(selectedContent));
        }
    }, [textEditor, bookmark])


    /* useEffect(() => {
        console.log("setbookmark:", setbookmark)
    }, [setbookmark]) */

    /*
                function findNodePositionByAttribute(editor: Editor, nodeTypeName: string, attrKey: string, attrValue: string): number | null {
              let foundPos: number | null = null;
    
              editor.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
                // console.log(node.content)
                node.content.forEach((node) => {
                  // console.log(node)
                  //@ts-ignore
                  node.marks.forEach((mark) => {
                    //console.log(mark)
                    console.log(mark.attrs)
                    if (mark.attrs.id === attrValue) {
                      foundPos = pos;
                      return false; // stop traversal
                    }
                  })
                  // console.log(node.marks)
                })
                return true;
              });
    
              return foundPos;
            }
    
            if (activeEditor) {
              const pos = findNodePositionByAttribute(activeEditor, 'apparatusText', 'id', 'cce391e7-77fa-43e9');
              console.log(pos)
              if (pos) {
                activeEditor?.commands.setTextSelection(pos);
                activeEditor?.commands.focus(pos);
                activeEditor?.commands.scrollIntoView();
              }
            }
    */


    return (
        <ResizablePanelGroup direction="horizontal">
            <ResizablePanel>
                {textEditor && <BubbleToolbar
                    editor={textEditor}
                    textColor={textColor}
                // highlightColor={highlightColor}
                // setTextColor={setTextColor}
                // setHighlightColor={setHighlightColor}
                />}
                <EditorTextArea
                    title="Text"
                    editor={textEditor}
                    setActiveEditor={setActiveEditor}
                />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel>
            </ResizablePanel>
            <PageSetupDialog
                open={isPageSetupOpen}
                onClose={() => setIsPageSetupOpen(false)}
            />
        </ResizablePanelGroup>
    )
})
