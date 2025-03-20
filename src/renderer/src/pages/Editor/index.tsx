/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, Editor } from '@tiptap/react';
import { rendererLogger } from '../../utils/logger';
import ToolbarComponent from './components/toolbar';
import EditorWrapper from './components/editorTextArea';
import { defaultEditorConfig } from './utils/editorConfigs';
import { useHistoryState } from './hooks';
import { Box } from '@mui/material';
import BubbleToolbar from './components/bubbleToolbar';
import { useDispatch, useSelector } from 'react-redux';
import { addComment, addCategory, setCategoriesData } from '../Comments/store/comments.slice';
import { getAllCategories } from '../Comments/store/comments.selector';
import { v4 as uuidv4 } from 'uuid';
import { setSidebarOpen } from '../MainContainer/store/main.slice';
import styles from './index.module.css';

interface EditorComponentProps {
  open: boolean;
}

const EditorComponent: React.FC<EditorComponentProps> = ({ open }) => {
  const textColorInputRef = useRef<HTMLInputElement>(null);
  const highlightColorInputRef = useRef<HTMLInputElement>(null);
  const undoInputRef = useRef<HTMLInputElement>(null);

  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [textColor, setTextColor] = useState<string>('inherit');
  const [highlightColor, setHighlightColor] = useState<string>('inherit');
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
      mainText: textEditor.getHTML() || '',
      apparatusText: apparatusEditor.getHTML() || '',
      comments: categoriesRef.current || []
    };
    console.log("🚀 ~ updateHandler ~ editorContent:", editorContent)

    const taskId = rendererLogger.startTask("TextEditor", "Content update");

    /*
    remove comment
    try {
      window.electron.sendData(editorContent);
      rendererLogger.endTask(taskId, "TextEditor", "Editor content updated");
    } catch (error) {
      rendererLogger.error("TextEditor", "Error while sending data to main process", error as Error);
    }
    */

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



  //  remove comment

  useEffect(() => {
    if (!window.electron) return;

    /*
    const removeUndoListener = window.electron.onUndoChange(() => {
      activeEditor?.chain().focus().undo().run();
    });

    const removeRedoListener = window.electron.onRedoChange(() => {
      activeEditor?.chain().focus().redo().run();
    });*/

    const removeUndoListener = window.electron.ipcRenderer.on("trigger-undo", () => {
      activeEditor?.chain().focus().undo().run();
    });

    const removeRedoListener = window.electron.ipcRenderer.on("trigger-redo", () => {
      activeEditor?.chain().focus().redo().run();
    });

    window.electron.ipcRenderer.removeAllListeners("trigger-undo");
    window.electron.ipcRenderer.removeAllListeners("trigger-redo");

    return () => {
      removeUndoListener();
      removeRedoListener();
    };
  }, [activeEditor]);

  useEffect(() => {
    const taskId = rendererLogger.startTask("TextEditor", "DocOpening initialized");

    /*
        remove comment

    try {
      window.electron.getOpenedDocumentContent((content: DocumentContent) => {
        if (textEditor) {
          setOpenedDocContent(content);
        }
      });
      window.electron.startNewDocument((content: DocumentContent) => {
        if (textEditor) {
          setOpenedDocContent(content);
        }
      });
      rendererLogger.endTask(taskId, "TextEditor", "DocOpening action completed");
    } catch (error) {
      rendererLogger.error("TextEditor", "DocOpening: Error while getting data from main process", error as Error);
    }
    */

    try {
      window.electron.ipcRenderer.on('opened-doc', (_event, content: DocumentContent) => {
        if (textEditor) {
          setOpenedDocContent(content);
        }
      });
      window.electron.ipcRenderer.on('opened-doc', (_event, content: DocumentContent) => {
        if (textEditor) {
          setOpenedDocContent(content);
        }
      });

      window.electron.ipcRenderer.on('new-doc', (_event, content: DocumentContent) => {
        if (textEditor) {
          setOpenedDocContent(content);
        }
      });

      window.electron.ipcRenderer.removeAllListeners('opened-doc');
      window.electron.ipcRenderer.removeAllListeners('new-doc');

      rendererLogger.endTask(taskId, "TextEditor", "DocOpening action completed");
    } catch (error) {
      rendererLogger.error("TextEditor", "DocOpening: Error while getting data from main process", error as Error);
    }
  }, [textEditor, apparatusEditor]);

  const setOpenedDocContent = (content: DocumentContent) => {
    if (!content) {
      console.error("Received null or undefined document content");
      return;
    }
    const docContent = JSON.parse(content as string);
    if (textEditor && apparatusEditor) {
      console.log("🚀 ~ setOpenedDocContent ~ docContent:", docContent)
      textEditor.commands.setContent(docContent?.mainText);
      apparatusEditor.commands.setContent(docContent?.apparatusText);
      if (docContent?.comments)
        dispatch(setCategoriesData(docContent?.comments));
    }
  }

  const handleIsHeadingChange = useCallback((heading: boolean, fontSize?: string | null) => {
    const currentEditor = activeEditor === textEditor ? 'textEditor' : 'apparatusEditor';
    const updates: Partial<typeof editorState['textEditor']> = { isHeading: heading };

    if (fontSize !== undefined) {
      updates.lastFontSize = fontSize;
    }

    updateEditorState(currentEditor, updates);
  }, [activeEditor, textEditor, updateEditorState]);

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
    /*
      const removeInsertCommentListener = window.electron.onInsertComment(() => {
        handleAddComment();
      });*/

    const removeInsertCommentListener = window.electron.ipcRenderer.on("insert-comment", () => {
      handleAddComment();
    });

    return () => {
      removeInsertCommentListener();
    };
  }, [activeEditor, categories, handleAddComment]);

  const currentEditorKey = activeEditor === textEditor ? 'textEditor' : 'apparatusEditor';
  const currentEditorState = editorState[currentEditorKey];

  const currentHistory = activeEditor === textEditor ? textHistory : apparatusHistory;

  return (activeEditor ?
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
      }}
      className={styles["editor-container"]}
    >
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          backgroundColor: 'background.paper'
        }}
      >
        <ToolbarComponent
          open={open}
          activeEditor={activeEditor}
          textColorInputRef={textColorInputRef}
          highlightColorInputRef={highlightColorInputRef}
          setTextColor={setTextColor}
          setHighlightColor={setHighlightColor}
          lastFontSize={currentEditorState.lastFontSize}
          setLastFontSize={(size) => handleIsHeadingChange(false, size)}
          isHeading={currentEditorState.isHeading}
          setIsHeading={(heading) => handleIsHeadingChange(heading)}
          undoInputRef={undoInputRef}
          historyState={currentHistory.historyState}
          revertToAction={currentHistory.restoreHistoryAction}
          trackHistoryActions={currentHistory.trackHistoryActions}
        />
      </Box>
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          minHeight: 0
        }}
        className={styles["editor-wrapper-container"]}
      >
        <Box className={styles["editor-wrapper"]}>
          {activeEditor && (
            <BubbleToolbar
              editor={activeEditor}
              textColor={textColor}
              highlightColor={highlightColor}
              setTextColor={setTextColor}
              setHighlightColor={setHighlightColor}
            />
          )}
          <EditorWrapper title="Text" editor={textEditor} setActiveEditor={setActiveEditor} />
          <EditorWrapper title="Apparatus" editor={apparatusEditor} setActiveEditor={setActiveEditor} />
        </Box>
      </Box>
    </Box> : null
  );
}

export default EditorComponent;
