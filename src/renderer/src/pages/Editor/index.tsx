/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, Editor } from '@tiptap/react';
import { rendererLogger } from '../../utils/logger';
import ToolbarComponent from './components/toolbar';
import EditorWrapper from './components/editorTextArea';
import { defaultEditorConfig } from './utils/editorConfigs';
import { useHistoryState } from './hooks';
import BubbleToolbar from './components/bubbleToolbar';
import { useDispatch, useSelector } from 'react-redux';
import { addComment, addCategory, setCategoriesData } from '../Comments/store/comments.slice';
import { getAllCategories } from '../Comments/store/comments.selector';
import { v4 as uuidv4 } from 'uuid';
import { setSidebarOpen } from '../store/main.slice';
import styles from './index.module.css';

interface EditorComponentProps {
  open: boolean;
  toggleSidebar: () => void;
}

const EditorComponent: React.FC<EditorComponentProps> = ({ open, toggleSidebar }) => {
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
      mainText: textEditor.getJSON() || '',
      apparatusText: apparatusEditor.getJSON() || '',
      comments: categoriesRef.current || []
    };
    console.log("🚀 ~ updateHandler ~ editorContent:", editorContent)
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
    <div className='absolute w-inherit flex flex-col top-0 right-0 bottom-0'>
      <div
        className='position-sticky top-0 z-1100 bg-background-paper'
      >
        <ToolbarComponent
          toggleSidebar={() => toggleSidebar()}
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
      </div>
      <div className="flex flex-col h-[calc(100% - 3rem)] grow min-h-0 overflow-auto">
        <div className="flex flex-row h-full w-full overflow-hidden">
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
        </div>
      </div>
    </div> : null
  );
}

export default EditorComponent;
