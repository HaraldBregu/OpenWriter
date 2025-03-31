import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { addCategory, addComment, setCategoriesData } from "../Comments/store/comments.slice";
import { setSidebarOpen } from "../store/main.slice";
import { rendererLogger } from "@/utils/logger";
import { Editor } from "@tiptap/core";
import { useEditor } from "@tiptap/react";
import { useDispatch, useSelector } from "react-redux";
import { getAllCategories } from "../Comments/store/comments.selector";
import { useHistoryState } from "./hooks";
import { defaultEditorConfig } from "./utils/editorConfigs";
import { v4 as uuidv4 } from 'uuid';
import { toggleBold, setHeadingLevel, redo, setFontFamily, setFontSize, increaseFontSize, decreaseFontSize, toggleItalic, toggleUnderline, setComment, executeComment, executeBookmark, setHighlightColor, setTextColor } from "./store/editor.slice";
import { selectBookmarksCategories, selectFontFamily, selectFontSize, selectHeadingLevel, selectHighlightColor, selectIsBold, selectIsHeading, selectIsItalic, selectIsUnderline, selectTextColor } from "./store/editor.selector";
import Toolbar from "./components/toolbar";

interface EHeaderProps {
    editor: Editor | null;
    setActiveEditor: (editor: Editor) => void;
    onClickAddComment: () => void;
    onClickAddBookmark: (category?: string) => void;
}

export const EHeader = ({
    editor,
    setActiveEditor,
    onClickAddComment,
    onClickAddBookmark
}: EHeaderProps) => {
    const textColorInputRef = useRef<HTMLInputElement>(null);
    const highlightColorInputRef = useRef<HTMLInputElement>(null);
    const undoInputRef = useRef<HTMLInputElement>(null);
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
        onUpdate: () => setActiveEditor(editor!)
    });

    const apparatusEditor = useEditor({
        ...defaultEditorConfig,
        onUpdate: () => setActiveEditor(editor!)
    });

    const textHistory = useHistoryState(textEditor);
    const apparatusHistory = useHistoryState(apparatusEditor);

    useEffect(() => {
        if (editor === null) {
            setActiveEditor(editor!);
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
        if (!editor) return;

        if (!textEditor || !apparatusEditor) return;

        const editorContent = {
            mainText: textEditor.getJSON() || '',
            apparatusText: apparatusEditor.getJSON() || '',
            comments: categoriesRef.current || []
        };

        console.log("🚀 ~ updateHandler ~ editorContent:", editorContent)
        console.log(JSON.stringify(textEditor.getJSON()))
        console.log("🚀 ~ updateHandler ~ textEditor HTML", textEditor.getHTML())

        const taskId = rendererLogger.startTask("TextEditor", "Content update");

        try {
            window.electron.ipcRenderer.send('currentDocumentUpdate', editorContent);
            rendererLogger.endTask(taskId, "TextEditor", "Editor content updated");
        } catch (error) {
            rendererLogger.error("TextEditor", "Error while sending data to main process", error as Error);
        }

    }, [editor, textEditor, apparatusEditor]);

    useEffect(() => {
        if (editor) {
            editor.on('update', updateHandler);
        }

        return () => {
            if (editor)
                editor.off('update', updateHandler);
        }
    }, [editor, categories]);

    useEffect(() => {
        updateHandler();
    }, [categories])


    useEffect(() => {
        if (!window.electron) return;

        const removeUndoListener = window.electron.ipcRenderer.on("trigger-undo", () => {
            editor?.chain().focus().undo().run();
        });

        const removeRedoListener = window.electron.ipcRenderer.on("trigger-redo", () => {
            editor?.chain().focus().redo().run();
        });

        return () => {
            removeUndoListener();
            removeRedoListener();
        };
    }, [editor]);

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

    const handleIsHeadingChange = useCallback((heading: boolean, fontSize?: string | null) => {
        const currentEditor = editor === textEditor ? 'textEditor' : 'apparatusEditor';
        const updates: Partial<typeof editorState['textEditor']> = { isHeading: heading };

        if (fontSize !== undefined) {
            updates.lastFontSize = fontSize;
        }

        updateEditorState(currentEditor, updates);
    }, [editor, textEditor, updateEditorState]);

    const handleAddComment = useCallback(() => {
        if (!editor) return;

        const { from, to } = editor.state.selection;
        const selectedContent = editor.state.doc.textBetween(from, to, ' ');

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
    }, [editor, categories, dispatch]);

    useEffect(() => {
        if (!window.electron) return;

        const removeInsertCommentListener = window.electron.ipcRenderer.on("insert-comment", () => {
            handleAddComment();
        });

        return () => {
            removeInsertCommentListener();
        };
    }, [editor, categories, handleAddComment]);

    const currentEditorKey = editor === textEditor ? 'textEditor' : 'apparatusEditor';
    const currentEditorState = editorState[currentEditorKey];
    const currentHistory = editor === textEditor ? textHistory : apparatusHistory;

/*     const categories = useSelector(selectBookmarksCategories);
 */
    return (
        <Toolbar
            isBold={useSelector(selectIsBold)}
            onClickBold={() => dispatch(toggleBold())}
            isItalic={useSelector(selectIsItalic)}
            onClickItalic={() => dispatch(toggleItalic())}
            isUnderline={useSelector(selectIsUnderline)}
            onClickUnderline={() => dispatch(toggleUnderline())}
            isHeading={useSelector(selectIsHeading)}
            headingLevel={useSelector(selectHeadingLevel)}
            onSelectHeading={(level: number) => dispatch(setHeadingLevel(level))}
            onRedo={() => {
                dispatch(redo(true))
                setTimeout(() => {
                    dispatch(redo(false))
                }, 100);
            }}
            fontFamily={useSelector(selectFontFamily)}
            onSetFontFamily={(fontFamily: string) => dispatch(setFontFamily(fontFamily))}
            fontSize={useSelector(selectFontSize)}
            onSetFontSize={(fontSize: number) => dispatch(setFontSize(fontSize))}
            onIncreaseFontSize={() => dispatch(increaseFontSize())}
            onDecreaseFontSize={() => dispatch(decreaseFontSize())}
            onClickAddComment={() => {
                //dispatch(executeComment())
                onClickAddComment()
            }}
            onClickAddBookmark={(category?: string) => onClickAddBookmark(category)}
            bookmarksCategories={useSelector(selectBookmarksCategories)}
            open={true}
            activeEditor={editor}
            textColorInputRef={textColorInputRef}
            highlightColorInputRef={highlightColorInputRef}
            textColor={useSelector(selectTextColor)}
            setTextColor={(value) => dispatch(setTextColor(value))}
            highlightColor={useSelector(selectHighlightColor)}
            setHighlightColor={(value) => dispatch(setHighlightColor(value))}
            lastFontSize={currentEditorState.lastFontSize}
            setLastFontSize={(size) => handleIsHeadingChange(false, size)}
            setIsHeading={(heading) => handleIsHeadingChange(heading)}
            undoInputRef={undoInputRef}
            historyState={currentHistory.historyState}
            revertToAction={currentHistory.restoreHistoryAction}
            trackHistoryActions={currentHistory.trackHistoryActions}
        />
    )
}
